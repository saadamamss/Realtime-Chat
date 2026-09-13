import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.stubGlobal('useRuntimeConfig', () => ({
  jwtSecret: 'test-secret-for-unit-tests',
}))

const auth = await import('../../server/utils/auth')

describe('auth utilities', () => {
  it('hashPassword produces a hash', async () => {
    const hash = await auth.hashPassword('mypassword')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('mypassword')
    expect(hash.length).toBeGreaterThan(10)
  })

  it('verifyPassword returns true for correct password', async () => {
    const hash = await auth.hashPassword('testpass')
    const result = await auth.verifyPassword('testpass', hash)
    expect(result).toBe(true)
  })

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await auth.hashPassword('testpass')
    const result = await auth.verifyPassword('wrongpass', hash)
    expect(result).toBe(false)
  })

  it('signToken produces a JWT string', async () => {
    const token = await auth.signToken({ userId: 'user-123' })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('verifyToken returns payload for valid token', async () => {
    const token = await auth.signToken({ userId: 'user-456' })
    const payload = await auth.verifyToken(token)
    expect(payload).toBeTruthy()
    expect(payload!.userId).toBe('user-456')
  })

  it('verifyToken returns null for invalid token', async () => {
    const result = await auth.verifyToken('invalid.token.here')
    expect(result).toBeNull()
  })
})
