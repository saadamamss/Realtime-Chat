import { addContact } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = getHeader(event, 'x-user-id')
  if (!userId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { phone_number } = await readBody(event)
  if (!phone_number || typeof phone_number !== 'string' || !phone_number.trim()) {
    throw createError({ statusCode: 400, message: 'Phone number is required' })
  }

  const contact = addContact(userId, phone_number.trim())
  if (!contact) {
    throw createError({ statusCode: 404, message: 'User with this phone number not found' })
  }

  return { contact }
})
