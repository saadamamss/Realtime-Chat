import axios from 'axios'

export default defineNuxtPlugin(() => {
  const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
  })

  const state = reactive<{ user: { id: string; username: string; avatar: string } | null }>({
    user: null,
  })

  const loggedIn = computed(() => !!state.user)

  return {
    provide: {
      axios: api,
      auth: {
        get currentUser() {
          return state.user
        },
        get loggedIn() {
          return loggedIn.value
        },
        async login(username: string, phoneNumber: string, password: string, mode: 'login' | 'register' = 'login') {
          const { data } = await api.post('/auth/login', {
            username,
            phone_number: phoneNumber,
            password,
            mode,
          })
          state.user = data.user
          return data.user
        },
        async logout() {
          await api.post('/auth/logout')
          state.user = null
        },
        async fetchUser() {
          try {
            const { data } = await api.get('/auth/me')
            state.user = data.user
          } catch {
            state.user = null
          }
        },
      },
    },
  }
})
