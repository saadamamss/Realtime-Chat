import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  messageContentSchema,
  contactSchema,
  conversationSchema,
  deleteMessageSchema,
  sanitizeString,
} from '../../server/utils/validation'

describe('validation schemas', () => {
  describe('loginSchema', () => {
    it('validates valid login', () => {
      const result = loginSchema.safeParse({
        phone_number: '+1-555-0100',
        password: 'password123',
        mode: 'login',
      })
      expect(result.success).toBe(true)
    })

    it('validates valid register', () => {
      const result = loginSchema.safeParse({
        username: 'Alice',
        phone_number: '+1-555-0100',
        password: 'password123',
        mode: 'register',
      })
      expect(result.success).toBe(true)
    })

    it('allows empty username for login', () => {
      const result = loginSchema.safeParse({
        phone_number: '+1-555-0100',
        password: 'password123',
        mode: 'login',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing phone_number', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
        mode: 'login',
      })
      expect(result.success).toBe(false)
    })

    it('rejects short password', () => {
      const result = loginSchema.safeParse({
        phone_number: '+1-555-0100',
        password: '12345',
        mode: 'login',
      })
      expect(result.success).toBe(false)
    })

    it('defaults mode to login', () => {
      const result = loginSchema.parse({
        phone_number: '+1-555-0100',
        password: 'password123',
      })
      expect(result.mode).toBe('login')
    })
  })

  describe('messageContentSchema', () => {
    it('validates valid message', () => {
      const result = messageContentSchema.safeParse({
        conversation_id: 'conv-123',
        content: 'Hello!',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty conversation_id', () => {
      const result = messageContentSchema.safeParse({
        conversation_id: '',
        content: 'Hello!',
      })
      expect(result.success).toBe(false)
    })

    it('allows empty content (file-only messages)', () => {
      const result = messageContentSchema.parse({
        conversation_id: 'conv-123',
      })
      expect(result.content).toBe('')
    })
  })

  describe('contactSchema', () => {
    it('validates valid contact', () => {
      const result = contactSchema.safeParse({ phone_number: '+1-555-0100' })
      expect(result.success).toBe(true)
    })

    it('rejects empty phone_number', () => {
      const result = contactSchema.safeParse({ phone_number: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteMessageSchema', () => {
    it('validates delete for me', () => {
      const result = deleteMessageSchema.safeParse({ message_id: 'msg-1', mode: 'me' })
      expect(result.success).toBe(true)
    })

    it('validates delete for all', () => {
      const result = deleteMessageSchema.safeParse({ message_id: 'msg-1', mode: 'all' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid mode', () => {
      const result = deleteMessageSchema.safeParse({ message_id: 'msg-1', mode: 'everyone' })
      expect(result.success).toBe(false)
    })
  })

  describe('sanitizeString', () => {
    it('removes angle brackets and trims', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
      expect(sanitizeString('  hello  ')).toBe('hello')
    })

    it('handles clean strings', () => {
      expect(sanitizeString('normal text')).toBe('normal text')
    })
  })
})
