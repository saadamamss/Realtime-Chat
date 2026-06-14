import { getConversations } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const conversations = getConversations(userId)
  return { conversations }
})
