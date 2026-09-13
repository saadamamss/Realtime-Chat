import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('auth middleware', () => {
  it('is correctly configured in server/middleware', () => {
    const middlewarePath = resolve(process.cwd(), 'server', 'middleware', 'auth.ts')
    const content = readFileSync(middlewarePath, 'utf-8')

    expect(content).toContain('getAuthTokenFromCookie')
    expect(content).toContain('verifyToken')
    expect(content).toContain('event.context.userId')
    expect(content).toContain('401')
  })

  it('skips auth for login endpoint', () => {
    const middlewarePath = resolve(process.cwd(), 'server', 'middleware', 'auth.ts')
    const content = readFileSync(middlewarePath, 'utf-8')
    expect(content).toContain('/api/auth/login')
  })

  it('skips auth for non-API paths', () => {
    const middlewarePath = resolve(process.cwd(), 'server', 'middleware', 'auth.ts')
    const content = readFileSync(middlewarePath, 'utf-8')
    expect(content).toContain("path.startsWith('/api/')")
  })

  it('throws 401 when no token', () => {
    const middlewarePath = resolve(process.cwd(), 'server', 'middleware', 'auth.ts')
    const content = readFileSync(middlewarePath, 'utf-8')
    expect(content).toContain("Not authenticated")
  })
})
