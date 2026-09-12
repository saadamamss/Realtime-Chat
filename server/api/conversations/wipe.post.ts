import { isParticipant, wipeConversation } from '../../utils/db'
import { validate, wipeConversationSchema } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(wipeConversationSchema, body)
  if (!isParticipant(input.conversation_id, userId)) throw createError({ statusCode: 403, message: 'Not a participant' })
  wipeConversation(input.conversation_id, userId)
  return { success: true }
})
