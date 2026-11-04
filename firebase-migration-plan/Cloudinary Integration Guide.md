# Cloudinary Integration Guide for Chat App Migration

## Overview
This guide explains how to integrate Cloudinary for file storage in your chat app, replacing Firebase Storage. Cloudinary offers a generous free tier (25GB storage, 100GB bandwidth) without requiring payment methods.

## Why Cloudinary Instead of Firebase Storage?

### Advantages:
- ✅ **No payment required** (generous free tier)
- ✅ **25GB storage** (plenty for chat app)
- ✅ **100GB bandwidth** per month
- ✅ **Built-in image/video optimization**
- ✅ **CDN delivery** for fast file access
- ✅ **Easy integration** with Node.js

### Disadvantages:
- ❌ **Slightly different API** than Firebase Storage
- ❌ **No real-time events** for file uploads
- ❌ **File size limits** (10MB images, 100MB videos)

## Cloudinary Setup

### 1. Get Your Credentials
From your Cloudinary dashboard:
- **Cloud Name**: Found in dashboard URL or account settings
- **API Key**: In API Keys section
- **API Secret**: In API Keys section (keep private!)

### 2. Install Cloudinary SDK
```bash
npm install cloudinary
```

### 3. Environment Variables
Add to your `.env` file:
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Implementation Files

### 1. Cloudinary Configuration
```typescript
// server/utils/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

// Cloudinary file upload service
export class CloudinaryService {
  private static instance: CloudinaryService
  private cloudinary = cloudinary

  static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService()
    }
    return CloudinaryService.instance
  }

  // Upload file to Cloudinary
  async uploadFile(file: Buffer, filename: string, userId: string): Promise<string> {
    try {
      const result = await this.cloudinary.uploader.upload_stream(
        {
          folder: `chat-app/${userId}`,
          public_id: `${Date.now()}_${filename}`,
          resource_type: 'auto',
          quality: 'auto',
          format: 'auto'
        },
        (error, result) => {
          if (error) throw error
          return result.secure_url
        }
      )

      // Convert buffer to stream and pipe to Cloudinary
      const stream = require('stream')
      const bufferStream = new stream.PassThrough()
      bufferStream.end(file)
      bufferStream.pipe(result)

      return new Promise((resolve, reject) => {
        result.on('error', reject)
        result.on('end', () => resolve(result.secure_url))
      })
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error)
      throw error
    }
  }

  // Delete file from Cloudinary
  async deleteFile(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId)
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error)
      throw error
    }
  }

  // Get file info
  async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await this.cloudinary.api.resource(publicId)
      return result
    } catch (error) {
      console.error('Error getting file info:', error)
      throw error
    }
  }

  // List files in folder
  async listFiles(folder: string): Promise<any[]> {
    try {
      const result = await this.cloudinary.api.resources({
        type: 'upload',
        prefix: folder
      })
      return result.resources
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }
}

// Export singleton instance
export const cloudinaryService = CloudinaryService.getInstance()
```

### 2. Updated File Upload Handler
```typescript
// server/api/messages.post-cloudinary.ts
import path from 'path'
import fs from 'fs'
import { createMessage, addParticipant, getConversationParticipantIds, realtimeManager } from '../utils/db-firestore'
import { cloudinaryService } from '../utils/cloudinary'
import { validate, messageContentSchema, sanitizeString } from '../utils/validation'

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp4', 'webm', 'mov',
  'mp3', 'wav', 'ogg', 'm4a',
  'pdf',
  'zip', 'rar'
])

const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  '.gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  '.webp': [Buffer.from('RIFF')],
  '.pdf': [Buffer.from('%PDF')],
  '.mp3': [Buffer.from('ID3'), Buffer.from([0xFF, 0xFB])],
  '.zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
}

function validateFileContent(buffer: Buffer, ext: string): boolean {
  const expected = MAGIC_BYTES[ext]
  if (!expected) return true
  return expected.some(magic => buffer.subarray(0, magic.length).equals(magic))
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const user = await realtimeManager.findUserById(userId)
  if (!user) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, message: 'Invalid form data' })

  let content = ''
  let fileUrl = ''
  let fileExt = ''
  let fileSize = 0
  let customRId = ''
  let conversationId = ''
  let replyToRId = ''

  for (const part of body) {
    const name = part.name || ''
    if (name === 'content') content = part.data.toString()
    else if (name === 'conversation_id') conversationId = part.data.toString()
    else if (name === 'file_extension') fileExt = part.data.toString()
    else if (name === 'file_size') fileSize = parseInt(part.data.toString()) || 0
    else if (name === 'rId') customRId = part.data.toString()
    else if (name === 'reply_to_rId') replyToRId = part.data.toString()
    else if (name === 'file' && part.filename) {
      const ext = path.extname(part.filename).toLowerCase().slice(1)

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw createError({ statusCode: 400, message: `File type .${ext} is not allowed` })
      }

      // Check Cloudinary file size limits
      if (ext === 'mp4' || ext === 'mov' || ext === 'webm') {
        if (part.data.length > 100 * 1024 * 1024) { // 100MB
          throw createError({ statusCode: 400, message: 'Video file must be less than 100MB' })
        }
      } else if (ext === 'pdf' || ext === 'zip' || ext === 'rar') {
        if (part.data.length > 10 * 1024 * 1024) { // 10MB
          throw createError({ statusCode: 400, message: 'Document file must be less than 10MB' })
        }
      } else {
        if (part.data.length > 10 * 1024 * 1024) { // 10MB
          throw createError({ statusCode: 400, message: 'Image file must be less than 10MB' })
        }
      }

      if (!validateFileContent(part.data, ext)) {
        throw createError({ statusCode: 400, message: 'File content does not match extension' })
      }

      // Upload to Cloudinary
      try {
        fileUrl = await cloudinaryService.uploadFile(part.data, part.filename, userId)
      } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw createError({ statusCode: 500, message: 'Failed to upload file to Cloudinary' })
      }
    }
  }

  if (!conversationId) throw createError({ statusCode: 400, message: 'conversation_id is required' })

  addParticipant(conversationId, userId)

  const message = await createMessage(
    userId,
    conversationId,
    sanitizeString(content),
    fileUrl ? { url: fileUrl, ext: fileUrl.split('.').pop() || fileExt, size: fileSize } : undefined,
    customRId || undefined,
    replyToRId || undefined,
  )

  let replyTo
  if (replyToRId) {
    // Fetch reply message from Firestore
    const replyMessage = await db.collection('messages').doc(replyToRId).get()
    if (replyMessage.exists) {
      const data = replyMessage.data()
      replyTo = {
        rId: data.rId,
        sender: { id: data.sender_id, name: (await realtimeManager.findUserById(data.sender_id))?.username || '' },
        content: data.content
      }
    }
  }

  const formatted = {
    rId: message.rId,
    id: message.id,
    conversation_id: conversationId,
    sender: {
      id: userId,
      name: user.username,
      image: user.avatar || '',
    },
    content: message.content,
    file: message.file_url,
    file_extension: message.file_extension || '',
    file_size: message.file_size || undefined,
    reply_to: replyTo,
    read_at: message.read_at,
    created_at: message.created_at.toISOString(),
    created_at_time: message.created_at.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
    delivered_at: null as string | null,
  }

  // Broadcast to conversation participants
  realtimeManager.broadcastToConversation(conversationId, {
    type: 'new-message',
    message: formatted,
    conversation_id: conversationId,
    timestamp: new Date()
  })

  // Send to individual participants
  const participantIds = await getConversationParticipantIds(conversationId)
  let delivered = false
  
  for (const pid of participantIds) {
    if (pid !== userId) {
      realtimeManager.sendToUser(pid, {
        type: 'new-message',
        message: formatted,
        conversation_id: conversationId,
        timestamp: new Date()
      })
      
      if (!delivered) {
        await markDelivered(message.id)
        delivered = true
      }
    }
  }

  if (delivered) {
    formatted.delivered_at = new Date().toISOString()
    realtimeManager.sendToUser(userId, {
      type: 'delivery-update',
      message_id: message.rId,
      conversation_id: conversationId,
      timestamp: new Date()
    })
  }

  setResponseStatus(event, 201)
  return { message: formatted }
})
```

### 3. Updated File Download Handler
```typescript
// server/api/files/[...].get.ts
import { cloudinaryService } from '../../utils/cloudinary'

export default defineEventHandler(async (event) => {
  const path = event.context.params.path
  
  try {
    // Extract public ID from Cloudinary URL or path
    const publicId = path.replace('/api/files/', '').replace(/\?.*$/, '')
    
    // Get file info from Cloudinary
    const fileInfo = await cloudinaryService.getFileInfo(publicId)
    
    // Set appropriate content type
    setResponseHeaders(event, {
      'Content-Type': fileInfo.format ? `image/${fileInfo.format}` : 'application/octet-stream',
      'Content-Disposition': `inline; filename="${fileInfo.original_filename || publicId}"`,
      'Cache-Control': 'public, max-age=31536000'
    })
    
    // Return the file URL for direct download
    return { url: fileInfo.secure_url }
  } catch (error) {
    console.error('Error getting file:', error)
    throw createError({ statusCode: 404, message: 'File not found' })
  }
})
```

### 4. Frontend Cloudinary Integration
```typescript
// composables/useCloudinary.ts
import { ref } from 'vue'
import { cloudinary } from '~/utils/cloudinary'

export const useCloudinary = () => {
  const uploading = ref(false)
  const error = ref(null)
  
  // Upload file to Cloudinary
  const uploadFile = async (file: File, userId: string) => {
    try {
      uploading.value = true
      error.value = null
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'chat-app-upload') // Create this in Cloudinary dashboard
      formData.append('folder', `chat-app/${userId}`)
      formData.append('cloud_name', process.env.CLOUDINARY_CLOUD_NAME)
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      return data.secure_url
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      uploading.value = false
    }
  }
  
  // Get file preview URL
  const getFileUrl = (url: string, transformations = {}) => {
    if (!url) return ''
    
    const cloudinaryUrl = new URL(url)
    const publicId = cloudinaryUrl.pathname.split('/').pop().split('.')[0]
    
    return cloudinary.url(publicId, {
      width: 300,
      height: 300,
      crop: 'fill',
      ...transformations
    })
  }
  
  return {
    uploading,
    error,
    uploadFile,
    getFileUrl
  }
}
```

### 5. Updated File Upload Component
```vue
<!-- components/chat/MessageInput.vue -->
<template>
  <div class="message-input">
    <form @submit.prevent="sendMessage" class="message-form">
      <div class="input-group">
        <textarea
          v-model="message"
          placeholder="Type a message..."
          rows="1"
          @keydown.enter.prevent="sendMessage"
          @input="adjustHeight"
        ></textarea>
        
        <div class="input-actions">
          <label for="file-upload" class="file-upload-btn">
            📎
            <input
              id="file-upload"
              type="file"
              @change="handleFileSelect"
              accept="image/*,video/*,.pdf,.zip,.rar"
              style="display: none"
            />
          </label>
          
          <button type="submit" :disabled="!message.trim() && !selectedFile" class="send-btn">
            Send
          </button>
        </div>
      </div>
      
      <div v-if="selectedFile" class="file-preview">
        <div class="file-info">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
        </div>
        <button type="button" @click="removeFile" class="remove-file">✕</button>
      </div>
      
      <div v-if="uploading" class="uploading">
        Uploading...
      </div>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCloudinary } from '~/composables/useCloudinary'
import { useFirebase } from '~/composables/useFirebase'
import { useRealtimeChat } from '~/composables/useRealtimeChat'

const props = defineProps({
  conversationId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['send'])

const message = ref('')
const selectedFile = ref(null)
const { uploading, error, uploadFile } = useCloudinary()
const { user } = useFirebase()
const { sendMessage } = useRealtimeChat()

const adjustHeight = (event) => {
  event.target.style.height = 'auto'
  event.target.style.height = Math.min(event.target.scrollHeight, 120) + 'px'
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file size
  if (file.size > 10 * 1024 * 1024) { // 10MB
    error.value = 'File size must be less than 10MB'
    return
  }
  
  selectedFile.value = file
}

const removeFile = () => {
  selectedFile.value = null
  error.value = null
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const sendMessage = async () => {
  if (!message.value.trim() && !selectedFile.value) return
  
  try {
    let fileUrl = ''
    
    // Upload file if selected
    if (selectedFile.value) {
      fileUrl = await uploadFile(selectedFile.value, user.value.uid)
    }
    
    // Send message with file URL
    emit('send', message.value, fileUrl ? {
      file: selectedFile.value,
      url: fileUrl
    } : null)
    
    // Reset form
    message.value = ''
    selectedFile.value = null
    error.value = null
  } catch (err) {
    error.value = err.message
  }
}
</script>

<style scoped>
.message-input {
  padding: 1rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.message-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  resize: none;
  font-size: 1rem;
  min-height: 44px;
  max-height: 120px;
}

.input-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.file-upload-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  font-size: 1.25rem;
  transition: background-color 0.2s;
}

.file-upload-btn:hover {
  background: #e2e8f0;
}

.send-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.send-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.file-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.file-info {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
}

.remove-file {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #64748b;
  padding: 0.25rem;
}

.remove-file:hover {
  color: #dc2626;
}

.uploading {
  text-align: center;
  padding: 0.5rem;
  color: #64748b;
  font-size: 0.875rem;
}

.error {
  text-align: center;
  padding: 0.5rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 4px;
  font-size: 0.875rem;
}
</style>
```

## Cloudinary Setup Steps

### 1. Create Cloudinary Upload Preset
1. Go to Cloudinary dashboard
2. Go to "Upload" section
3. Create a new upload preset named "chat-app-upload"
4. Set settings:
   - Signing mode: Unsigned
   - Allowed formats: Images, videos, raw files
   - Maximum file size: 10MB (or adjust as needed)
   - Folder: "chat-app"

### 2. Test the Integration
```bash
# Test Cloudinary upload
node test-cloudinary-upload.mjs
```

### 3. Update Environment Variables
Add to your `.env` file:
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Migration Benefits with Cloudinary

### Advantages:
- ✅ **No payment required** (works with free tier)
- ✅ **25GB storage** (plenty for chat app)
- ✅ **CDN delivery** for fast file access
- ✅ **Built-in optimization** for images/videos
- ✅ **Easy integration** with existing codebase

### Next Steps:
1. **Get Cloudinary credentials** from dashboard
2. **Install Cloudinary SDK**
3. **Update environment variables**
4. **Test file upload functionality**
5. **Update frontend components**

This Cloudinary integration provides a complete file storage solution without requiring payment methods, making it perfect for your chat app migration.