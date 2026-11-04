import path from 'path'
import fs from 'fs'
import { createMessage, addParticipant, getConversationParticipantIds, realtimeManager } from '../utils/db-firestore'
import { cloudinaryService } from '../utils/cloudinary'
import { validate, messageContentSchema, sanitizeString } from '../utils/validation'

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

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

      try {
        // Upload to Cloudinary
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