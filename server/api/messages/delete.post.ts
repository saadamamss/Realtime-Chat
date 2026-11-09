import { deleteMessage, getConversationParticipantIds } from '../../lib/db-facade'
import { sendToUser } from '../../utils/ws'
import { validate, deleteMessageSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(deleteMessageSchema, body)
  const conversationId = await deleteMessage(input.message_id, userId, input.mode)
  if (!conversationId) throw createError({ statusCode: 404, message: 'Message not found or not authorized' })
  if (input.mode === 'all') {
    const payload = JSON.stringify({ type: 'message-deleted', message_id: input.message_id, conversation_id: conversationId })
    const participantIds = await getConversationParticipantIds(conversationId)
    for (const pid of participantIds) {
      if (pid !== userId) sendToUser(pid, payload)
    }
  }
  return { success: true }
})
