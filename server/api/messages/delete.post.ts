import { deleteMessage, getConversationParticipantIds } from '../../utils/db'
import { sendToUser } from '../../utils/ws'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const { message_id, mode } = body
  if (!message_id || !mode) throw createError({ statusCode: 400, message: 'message_id and mode are required' })
  if (!['me', 'all'].includes(mode)) throw createError({ statusCode: 400, message: 'mode must be "me" or "all"' })

  const conversationId = deleteMessage(message_id, userId, mode)
  if (!conversationId) throw createError({ statusCode: 404, message: 'Message not found or not authorized' })

  if (mode === 'all') {
    const payload = JSON.stringify({ type: 'message-deleted', message_id, conversation_id: conversationId })
    const participantIds = getConversationParticipantIds(conversationId)
    for (const pid of participantIds) {
      if (pid !== userId) {
        sendToUser(pid, payload)
      }
    }
  }

  return { success: true }
})
