import { getConversations } from '../lib/db-facade'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const conversations = await getConversations(userId)
  return { conversations }
})
