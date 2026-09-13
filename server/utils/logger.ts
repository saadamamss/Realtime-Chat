import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
})

export function logRequest(method: string, url: string, status: number, duration: number) {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
  logger[level]({ method, url, status, duration: `${duration}ms` }, `${method} ${url} ${status} ${duration}ms`)
}

export function logError(message: string, error?: any) {
  logger.error({ err: error }, message)
}

export function logInfo(message: string, data?: Record<string, unknown>) {
  logger.info(data, message)
}
