import { isParticipant, deleteConversation } from '../utils/db'
import { validate, deleteConversationSchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(deleteConversationSchema, body)
  if (!isParticipant(input.conversation_id, userId)) throw createError({ statusCode: 403, message: 'Not a participant' })
  deleteConversation(input.conversation_id, userId)
  return { success: true }
})
