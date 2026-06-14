import { findOrCreateUser } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { username, phone_number } = await readBody(event)
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw createError({ statusCode: 400, message: 'Username is required' })
  }
  if (!phone_number || typeof phone_number !== 'string' || !phone_number.trim()) {
    throw createError({ statusCode: 400, message: 'Phone number is required' })
  }
  const user = findOrCreateUser(username.trim(), phone_number.trim())
  return { user }
})
