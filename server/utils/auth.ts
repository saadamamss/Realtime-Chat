import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const config = useRuntimeConfig()
const JWT_SECRET = new TextEncoder().encode(config.jwtSecret || 'dev-secret-change-in-production')
const JWT_EXPIRY = '7d'

const COOKIE_NAME = 'chat_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function signToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}

export function setAuthCookie(event: any, token: string) {
  setCookie(event, COOKIE_NAME, token, COOKIE_OPTIONS)
}

export function clearAuthCookie(event: any) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getAuthTokenFromCookie(event: any): string | null {
  return getCookie(event, COOKIE_NAME) || null
}
