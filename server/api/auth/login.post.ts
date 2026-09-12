import { findUserByPhoneNumber, createUser } from '../../utils/db'
import { hashPassword, verifyPassword, signToken, setAuthCookie } from '../../utils/auth'
import { loginSchema, validate, sanitizeString } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const input = validate(loginSchema, body)

  const trimmedPhone = input.phone_number.trim()
  const existingUser = findUserByPhoneNumber(trimmedPhone)

  if (input.mode === 'register') {
    if (!input.username) {
      throw createError({ statusCode: 400, message: 'Username is required' })
    }
    if (existingUser) {
      throw createError({ statusCode: 409, message: 'Phone number already registered' })
    }
    const passwordHash = await hashPassword(input.password)
    const user = createUser(sanitizeString(input.username), trimmedPhone, passwordHash)
    const token = await signToken({ userId: user.id })
    setAuthCookie(event, token)
    return { user }
  }

  if (!existingUser) {
    throw createError({ statusCode: 401, message: 'Invalid phone number or password' })
  }
  if (!existingUser.password_hash) {
    throw createError({ statusCode: 401, message: 'Account has no password. Please register again.' })
  }
  const valid = await verifyPassword(input.password, existingUser.password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid phone number or password' })
  }
  const token = await signToken({ userId: existingUser.id })
  setAuthCookie(event, token)
  const user = {
    id: existingUser.id,
    username: existingUser.username,
    phone_number: existingUser.phone_number,
    avatar: existingUser.avatar,
  }
  return { user }
})
