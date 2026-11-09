import { getMessages } from '../lib/db-facade'
import { validate, messagesQuerySchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const query = validate(messagesQuerySchema, getQuery(event))
  const result = await getMessages(query.conversation_id, userId, query.page)
  return result
})
