import { getMessages } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const conversationId = query.conversation_id as string
  if (!conversationId) throw createError({ statusCode: 400, message: 'conversation_id is required' })

  const page = parseInt(query.page as string) || 1
  const result = getMessages(conversationId, userId, page)
  return result
})
