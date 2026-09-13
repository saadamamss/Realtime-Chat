<template>
  <div class="flex items-center justify-center h-screen bg-chat-bg px-4">
    <div class="bg-surface rounded-2xl shadow-xl border border-border p-8 w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <UIcon name="ph-chats" class="w-8 h-8 text-accent" />
        </div>
        <h1 class="text-2xl font-bold text-text-primary">Welcome to Chat</h1>
        <p class="text-sm text-text-secondary mt-1">{{ isRegister ? 'Create your account' : 'Sign in to continue' }}</p>
      </div>
      <form @submit.prevent="handleSubmit">
        <div v-if="isRegister" class="mb-3">
          <input v-model="username" type="text" placeholder="Your name..."
            class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            maxlength="30" autofocus />
        </div>
        <input v-model="phoneNumber" type="tel" placeholder="Phone number..."
          class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all mb-3" />
        <input v-model="password" type="password" placeholder="Password (min 6 characters)..."
          class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all mb-4"
          minlength="6" />
        <button type="submit" :disabled="!canSubmit || loading"
          class="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-gray-200 text-white font-semibold text-sm transition-all disabled:cursor-not-allowed cursor-pointer">
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <UIcon name="ph-circle-notch" class="w-4 h-4 animate-spin" />
            {{ isRegister ? 'Creating account...' : 'Signing in...' }}
          </span>
          <span v-else>{{ isRegister ? 'Create Account' : 'Sign In' }}</span>
        </button>
      </form>
      <div class="mt-4 text-center">
        <button @click="isRegister = !isRegister"
          class="text-sm text-accent hover:text-accent-hover transition-colors cursor-pointer">
          {{ isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppToast } from '../composables/useAppToast'
import { useAuthStore } from '../stores/auth'

definePageMeta({
  layout: false,
  middleware: 'auth',
})

const authStore = useAuthStore()
const toast = useAppToast()
const router = useRouter()

const username = ref('')
const phoneNumber = ref('')
const password = ref('')
const loading = ref(false)
const isRegister = ref(false)

const canSubmit = computed(() => {
  if (!phoneNumber.value.trim() || !password.value || password.value.length < 6) return false
  if (isRegister.value && !username.value.trim()) return false
  return true
})

onMounted(async () => {
  await authStore.fetchUser()
  if (authStore.loggedIn) {
    router.replace('/chat')
  }
})

async function handleSubmit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  try {
    await authStore.login(
      username.value.trim(),
      phoneNumber.value.trim(),
      password.value,
      isRegister.value ? 'register' : 'login',
    )
    router.replace('/chat')
  } catch (e: any) {
    const msg = e?.response?.data?.message || 'Something went wrong'
    toast.error({
      title: isRegister.value ? 'Registration failed' : 'Login failed',
      description: msg,
    })
  } finally {
    loading.value = false
  }
}
</script>
