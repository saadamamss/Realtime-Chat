import { addContact } from '../lib/db-facade'
import { validate, contactSchema } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const body = await readBody(event)
  const input = validate(contactSchema, body)
  const contact = await addContact(userId, input.phone_number)
  if (!contact) {
    throw createError({ statusCode: 404, message: 'User with this phone number not found' })
  }
  return { contact }
})
