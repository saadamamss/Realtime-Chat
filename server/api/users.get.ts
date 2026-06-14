import { getAllUsers } from '../utils/db'

export default defineEventHandler(async () => {
  const users = getAllUsers()
  return { users }
})
