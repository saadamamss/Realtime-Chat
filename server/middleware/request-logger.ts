import { logRequest } from '../utils/logger'

export default defineEventHandler(async (event) => {
  const start = Date.now()

  event.res.on('finish', () => {
    const path = getRequestURL(event).pathname
    if (path.startsWith('/api/')) {
      const duration = Date.now() - start
      const method = event.method
      const status = event.res.statusCode
      logRequest(method, path, status, duration)
    }
  })
})
