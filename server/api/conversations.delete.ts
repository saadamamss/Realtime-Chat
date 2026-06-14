import { isParticipant, deleteConversation } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { conversation_id } = await readBody(event)
  if (!conversation_id) throw createError({ statusCode: 400, message: 'conversation_id is required' })
  if (!isParticipant(conversation_id, userId)) throw createError({ statusCode: 403, message: 'Not a participant' })

  deleteConversation(conversation_id, userId)

  return { success: true }
})
