import { isParticipant, deleteConversation } from '../lib/db-facade'
import { validate, deleteConversationSchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(deleteConversationSchema, body)
  if (!(await isParticipant(input.conversation_id, userId))) throw createError({ statusCode: 403, message: 'Not a participant' })
  await deleteConversation(input.conversation_id, userId)
  return { success: true }
})
