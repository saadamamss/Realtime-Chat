import path from 'path'
import fs from 'fs'
import { createMessage, addParticipant, getConversationParticipantIds, markDelivered, findUserById, getMessageByRId } from '../lib/db-facade'
import { broadcastToConversation, sendToUser, isUserSubscribed } from '../utils/ws'
import { validate, messageContentSchema, sanitizeString } from '../utils/validation'

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp4', 'webm', 'mov',
  'mp3', 'wav', 'ogg', 'm4a',
  'pdf',
  'zip', 'rar',
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

  const user = await findUserById(userId)
  if (!user) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, message: 'Invalid form data' })

  let content = ''
  let filePath = ''
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

      if (part.data.length > 2 * 1024 * 1024) {
        throw createError({ statusCode: 400, message: 'File size must be less than 2MB' })
      }

      if (!validateFileContent(part.data, ext)) {
        throw createError({ statusCode: 400, message: 'File content does not match extension' })
      }

      const filename = `${crypto.randomUUID()}.${ext}`
      filePath = `/uploads/${filename}`
      await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), part.data)
    }
  }

  if (!conversationId) throw createError({ statusCode: 400, message: 'conversation_id is required' })

  await addParticipant(conversationId, userId)

  const message = await createMessage(
    userId,
    conversationId,
    sanitizeString(content),
    filePath ? { url: filePath, ext: filePath.split('.').pop() || fileExt, size: fileSize } : undefined,
    customRId || undefined,
    replyToRId || undefined,
  ) as any

  let replyTo
  if (replyToRId) {
    const target = await getMessageByRId(replyToRId)
    if (target) {
      replyTo = { rId: target.rId, sender: { id: target.sender_id, name: target.sender_name }, content: target.content }
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
    file: message.file,
    file_extension: message.file_extension || '',
    file_size: message.file_size || undefined,
    reply_to: replyTo,
    read_at: message.read_at,
    created_at: message.created_at,
    created_at_time: message.created_at_time,
    status: 'sent' as const,
    delivered_at: null as string | null,
  }

  const payload = JSON.stringify({ type: 'new-message', message: formatted, conversation_id: conversationId })
  broadcastToConversation(conversationId, payload)
  // Delivery marking must never turn a persisted, broadcast message into a 500
  try {
    const participantIds = await getConversationParticipantIds(conversationId)
    let delivered = false
    for (const pid of participantIds) {
      if (pid !== userId) {
        sendToUser(pid, payload)
        if (!delivered && isUserSubscribed(pid, conversationId)) {
          await markDelivered(message.rId)
          delivered = true
        }
      }
    }
    if (delivered) {
      formatted.delivered_at = new Date().toISOString()
      sendToUser(userId, JSON.stringify({ type: 'delivery-update', message_id: message.rId, conversation_id: conversationId }))
    }
  } catch (err) {
    console.error('delivery marking failed (message was still persisted):', err)
  }

  setResponseStatus(event, 201)
  return { message: formatted }
})
