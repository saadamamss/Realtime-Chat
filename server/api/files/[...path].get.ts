import path from 'path'
import fs from 'fs'
import { isParticipant, getFileConversationId } from '../../lib/db-facade'

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const urlPath = event.path.replace('/api/files/', '')
  if (!urlPath || urlPath.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid file path' })
  }

  const filename = urlPath.replace(/^uploads\//, '')
  const fullPath = path.join(UPLOAD_DIR, filename)
  if (!fs.existsSync(fullPath)) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  const conversationId = await getFileConversationId(urlPath)
  if (!conversationId || !(await isParticipant(conversationId, userId))) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const buffer = await fs.promises.readFile(fullPath)
  const ext = path.extname(fullPath).toLowerCase()

  setResponseHeader(event, 'Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'private, max-age=31536000')
  return buffer
})
