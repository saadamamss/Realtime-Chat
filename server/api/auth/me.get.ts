import { getAuthTokenFromCookie, verifyToken } from '../../utils/auth'
import { findUserById } from '../../lib/db-facade'

export default defineEventHandler(async (event) => {
  const token = getAuthTokenFromCookie(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Invalid or expired session' })
  }

  const user = await findUserById(payload.userId)
  if (!user) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }

  return { user }
})
