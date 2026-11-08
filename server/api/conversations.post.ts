import { getOrCreateDMConversation } from '../lib/db-facade'
import { validate, conversationSchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(conversationSchema, body)
  const conversation = await getOrCreateDMConversation(userId, input.contact_id, userId)
  return { conversation }
})
