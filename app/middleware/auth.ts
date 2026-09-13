import { useAuthStore } from '../stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.loggedIn) {
    await authStore.fetchUser()
  }

  if (to.path === '/chat' && !authStore.loggedIn) {
    return navigateTo('/login')
  }

  if (to.path === '/login' && authStore.loggedIn) {
    return navigateTo('/chat')
  }
})
