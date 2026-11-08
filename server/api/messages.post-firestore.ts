import { createMessage, addParticipant, getConversationParticipantIds } from '../utils/db-firestore'
import { cloudinaryService } from '../utils/cloudinary'
import { validate, messageContentSchema, sanitizeString } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const user = await findUserById(userId)
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
    const replyMessage = await getDoc(doc(db, 'messages', replyToRId))
    if (replyMessage.exists()) {
      const data = replyMessage.data()
      const replyUser = await findUserById(data.sender_id)
      replyTo = {
        rId: data.rId,
        sender: { id: data.sender_id, name: replyUser?.username || '' },
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
    created_at: message.created_at.toDate().toISOString(),
    created_at_time: message.created_at.toDate().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
    delivered_at: null as string | null,
  }

  // Broadcast to conversation participants (implement this based on your real-time system)
  // For now, we'll just return the message
  // In a real implementation, you would use WebSockets or Firestore real-time listeners

  setResponseStatus(event, 201)
  return { message: formatted }
})