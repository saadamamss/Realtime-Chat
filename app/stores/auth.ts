import { defineStore } from 'pinia'

interface User {
  id: string
  username: string
  avatar: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const loggedIn = computed(() => !!user.value)
  const currentUser = computed(() => user.value)

  let axios: any = null

  function setAxios(instance: any) {
    axios = instance
  }

  async function login(username: string, phoneNumber: string, password: string, mode: 'login' | 'register' = 'login') {
    const { data } = await axios.post('/auth/login', {
      username,
      phone_number: phoneNumber,
      password,
      mode,
    })
    user.value = data.user
    return data.user
  }

  async function logout() {
    await axios.post('/auth/logout')
    user.value = null
  }

  async function fetchUser() {
    try {
      const { data } = await axios.get('/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    }
  }

  return {
    user,
    loading,
    loggedIn,
    currentUser,
    setAxios,
    login,
    logout,
    fetchUser,
  }
})
