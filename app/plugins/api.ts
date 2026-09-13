import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useContactsStore } from '../stores/contacts'

export default defineNuxtPlugin(() => {
  const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
  })

  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const contactsStore = useContactsStore()

  authStore.setAxios(api)
  chatStore.setAxios(api)
  chatStore.setAuthStore(authStore)
  contactsStore.setAxios(api)

  return {
    provide: {
      axios: api,
    },
  }
})
