import { getAllUsers } from '../lib/db-facade'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const users = await getAllUsers()
  return { users }
})
