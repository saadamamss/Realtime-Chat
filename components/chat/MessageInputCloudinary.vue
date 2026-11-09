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
          <div class="file-header">
            <span class="file-icon">{{ getFileIcon(selectedFile.type) }}</span>
            <div class="file-details">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
            </div>
          </div>
          
          <div v-if="selectedFile.type.startsWith('image/')" class="image-preview">
            <img :src="imagePreview" alt="Preview" />
          </div>
        </div>
        
        <button type="button" @click="removeFile" class="remove-file">✕</button>
      </div>
      
      <div v-if="uploading" class="uploading">
        <div class="progress-bar">
          <div class="progress" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <span>Uploading... {{ uploadProgress }}%</span>
      </div>
      
      <div v-if="error" class="error">
        {{ error }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
const uploading = ref(false)
const uploadProgress = ref(0)
const error = ref(null)
const imagePreview = ref('')

const { uploadFile, validateFile, formatFileSize, getFileIcon } = useCloudinary()
const { user } = useFirebase()
const { sendMessage } = useRealtimeChat()

const adjustHeight = (event) => {
  event.target.style.height = 'auto'
  event.target.style.height = Math.min(event.target.scrollHeight, 120) + 'px'
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    error.value = validation.error
    return
  }
  
  error.value = null
  selectedFile.value = file
  
  // Create image preview for images
  if (file.type.startsWith('image/')) {
    imagePreview.value = URL.createObjectURL(file)
  }
}

const removeFile = () => {
  selectedFile.value = null
  error.value = null
  imagePreview.value = ''
  uploadProgress.value = 0
  
  // Revoke image URL preview
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = ''
  }
}

const sendMessage = async () => {
  if (!message.value.trim() && !selectedFile.value) return
  
  try {
    let fileUrl = ''
    
    // Upload file if selected
    if (selectedFile.value) {
      uploading.value = true
      uploadProgress.value = 0
      
      // Simulate progress (Cloudinary doesn't provide progress in this implementation)
      const progressInterval = setInterval(() => {
        uploadProgress.value = Math.min(uploadProgress.value + 10, 90)
      }, 200)
      
      fileUrl = await uploadFile(selectedFile.value, user.value.uid)
      
      clearInterval(progressInterval)
      uploadProgress.value = 100
      
      // Small delay to let user see 100%
      await new Promise(resolve => setTimeout(resolve, 300))
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
    uploading.value = false
    uploadProgress.value = 0
    
    // Revoke image URL preview
    if (imagePreview.value) {
      URL.revokeObjectURL(imagePreview.value)
      imagePreview.value = ''
    }
  } catch (err) {
    error.value = err.message
    uploading.value = false
    uploadProgress.value = 0
  }
}

// Clean up on unmount
onMounted(() => {
  return () => {
    if (imagePreview.value) {
      URL.revokeObjectURL(imagePreview.value)
    }
  }
})
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
  padding: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  font-size: 1.5rem;
}

.file-details {
  display: flex;
  flex-direction: column;
}

.file-name {
  font-weight: 500;
  font-size: 0.875rem;
  word-break: break-word;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
}

.image-preview {
  margin-top: 0.5rem;
  border-radius: 4px;
  overflow: hidden;
  max-width: 200px;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.remove-file {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #64748b;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.remove-file:hover {
  color: #dc2626;
  background: #fef2f2;
}

.uploading {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s ease;
}

.uploading span {
  font-size: 0.875rem;
  color: #64748b;
  text-align: center;
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