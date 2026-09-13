import { getAuthTokenFromCookie, verifyToken } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (
    path === '/api/auth/login' ||
    path === '/api/auth/me' ||
    path === '/api/health' ||
    path.startsWith('/uploads/')
  ) {
    return
  }

  if (!path.startsWith('/api/')) {
    return
  }

  const token = getAuthTokenFromCookie(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw createError({ statusCode: 401, message: 'Invalid or expired session' })
  }

  event.context.userId = payload.userId
})
