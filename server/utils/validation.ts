import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(50).optional(),
  phone_number: z.string().trim().min(1, 'Phone number is required').max(20),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  mode: z.enum(['login', 'register']).default('login'),
})

export const messageContentSchema = z.object({
  conversation_id: z.string().min(1, 'conversation_id is required'),
  content: z.string().max(5000, 'Message too long').default(''),
  reply_to_rId: z.string().optional(),
})

export const contactSchema = z.object({
  phone_number: z.string().trim().min(1, 'Phone number is required').max(20),
})

export const conversationSchema = z.object({
  contact_id: z.string().min(1, 'contact_id is required'),
})

export const deleteMessageSchema = z.object({
  message_id: z.string().min(1, 'message_id is required'),
  mode: z.enum(['me', 'all']),
})

export const deleteConversationSchema = z.object({
  conversation_id: z.string().min(1, 'conversation_id is required'),
})

export const wipeConversationSchema = z.object({
  conversation_id: z.string().min(1, 'conversation_id is required'),
})

export const messagesQuerySchema = z.object({
  conversation_id: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
})

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ')
    throw createError({ statusCode: 400, message })
  }
  return result.data
}

export function sanitizeString(input: string): string {
  return input.replace(/[<>]/g, '').trim()
}
