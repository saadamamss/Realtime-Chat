import { getConversations } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const conversations = getConversations(userId)
  return { conversations }
})
