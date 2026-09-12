import { getAuthTokenFromCookie, verifyToken, signToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const token = getAuthTokenFromCookie(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Invalid session' })
  }

  const wsToken = await signToken({ userId: payload.userId })
  return { token: wsToken }
})
