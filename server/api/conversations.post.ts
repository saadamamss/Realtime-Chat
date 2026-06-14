import { getOrCreateDMConversation } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { contact_id } = await readBody(event)
  if (!contact_id) throw createError({ statusCode: 400, message: 'contact_id is required' })

  const conversation = getOrCreateDMConversation(userId, contact_id, userId)
  return { conversation }
})
