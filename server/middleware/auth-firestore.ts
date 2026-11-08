export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseTokenMiddleware(token)
    
    // Add user context to the event
    event.context.userId = decodedToken.userId
    event.context.user = decodedToken
    
  } catch (error) {
    console.error('Authentication error:', error)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})