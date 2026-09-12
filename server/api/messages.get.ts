import { getMessages } from '../utils/db'
import { validate, messagesQuerySchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const query = validate(messagesQuerySchema, getQuery(event))
  const result = getMessages(query.conversation_id, userId, query.page)
  return result
})
