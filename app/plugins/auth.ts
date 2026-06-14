import axios from 'axios'

export default defineNuxtPlugin(() => {
  const api = axios.create({
    baseURL: '/api',
  })

  const state = reactive<{ user: { id: string; username: string; avatar: string } | null }>({
    user: null,
  })

  if (process.client) {
    const saved = localStorage.getItem('chat_user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        state.user = parsed
        api.defaults.headers.common['x-user-id'] = parsed.id
      } catch {}
    }
  }

  return {
    provide: {
      axios: api,
      auth: {
        get currentUser() {
          return state.user
        },
        async login(username: string, phoneNumber: string) {
          const { data } = await api.post('/auth/login', { username, phone_number: phoneNumber })
          state.user = data.user
          api.defaults.headers.common['x-user-id'] = data.user.id
          if (process.client) {
            localStorage.setItem('chat_user', JSON.stringify(data.user))
          }
          return data.user
        },
        logout() {
          state.user = null
          delete api.defaults.headers.common['x-user-id']
          if (process.client) {
            localStorage.removeItem('chat_user')
          }
        },
      },
    },
  }
})
