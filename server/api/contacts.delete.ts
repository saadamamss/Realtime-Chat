import { removeContact } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const { contact_id } = await readBody(event)
  if (!contact_id) throw createError({ statusCode: 400, message: 'contact_id is required' })
  const removed = removeContact(userId, contact_id)
  if (!removed) throw createError({ statusCode: 404, message: 'Contact not found' })
  return { success: true }
})
