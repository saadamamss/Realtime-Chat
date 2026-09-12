import { getContacts } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const contacts = getContacts(userId)
  return { contacts }
})
