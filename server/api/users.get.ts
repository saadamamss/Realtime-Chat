import { getAllUsers } from '../utils/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const users = getAllUsers()
  return { users }
})
