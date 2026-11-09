import { getContacts } from '../lib/db-facade'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const contacts = await getContacts(userId)
  return { contacts }
})
