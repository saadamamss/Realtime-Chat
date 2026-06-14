import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'
import { createMessage, addParticipant, getConversationParticipantIds, getDb } from '../utils/db'
import { broadcastToConversation, sendToUser } from '../utils/ws'

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, message: 'Invalid form data' })

  let content = ''
  let senderName = ''
  let senderAvatar = ''
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
    else if (name === 'sender_name') senderName = part.data.toString()
    else if (name === 'sender_avatar') senderAvatar = part.data.toString()
    else if (name === 'file_extension') fileExt = part.data.toString()
    else if (name === 'file_size') fileSize = parseInt(part.data.toString()) || 0
    else if (name === 'rId') customRId = part.data.toString()
    else if (name === 'reply_to_rId') replyToRId = part.data.toString()
    else if (name === 'file' && part.filename) {
      const ext = path.extname(part.filename)
      const filename = `${uuid()}${ext}`
      filePath = `/uploads/${filename}`
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), part.data)
    }
  }

  if (!conversationId) throw createError({ statusCode: 400, message: 'conversation_id is required' })

  addParticipant(conversationId, userId)

  const message = createMessage(
    userId,
    conversationId,
    content,
    filePath ? { url: filePath, ext: fileExt, size: fileSize } : undefined,
    customRId || undefined,
    replyToRId || undefined,
  ) as any

  let replyTo
  if (replyToRId) {
    const db = getDb()
    const target = db.prepare(`
      SELECT m.rId, m.content, m.sender_id, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.rId = ?
    `).get(replyToRId) as any
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
      name: senderName || 'Unknown',
      image: senderAvatar || '',
    },
    content: message.content,
    file: message.file_url || '',
    file_extension: message.file_extension || '',
    file_size: message.file_size || undefined,
    reply_to: replyTo,
    read_at: message.read_at,
    created_at: message.created_at,
    created_at_time: new Date(message.created_at).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
  }

  const payload = JSON.stringify({ type: 'new-message', message: formatted, conversation_id: conversationId })
  broadcastToConversation(conversationId, payload)
  const participantIds = getConversationParticipantIds(conversationId)
  for (const pid of participantIds) {
    if (pid !== userId) {
      sendToUser(pid, payload)
    }
  }

  setResponseStatus(event, 201)
  return { message: formatted }
})
