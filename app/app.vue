<template>
  <div class="h-screen">
    <ClientOnly>
      <div v-if="!loggedIn" class="flex items-center justify-center h-full bg-chat-bg px-4">
        <div class="bg-surface rounded-2xl shadow-xl border border-border p-8 w-full max-w-sm">
          <div class="text-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="ph-chats" class="w-8 h-8 text-accent" />
            </div>
            <h1 class="text-2xl font-bold text-text-primary">Welcome to Chat</h1>
            <p class="text-sm text-text-secondary mt-1">Enter your name and phone number</p>
          </div>
          <form @submit.prevent="handleLogin">
            <input
              v-model="username"
              type="text"
              placeholder="Your name..."
              class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all mb-3"
              maxlength="30"
              autofocus
            />
            <input
              v-model="phoneNumber"
              type="tel"
              placeholder="Phone number..."
              class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all mb-4"
            />
            <button
              type="submit"
              :disabled="!username.trim() || !phoneNumber.trim() || loading"
              class="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-gray-200 text-white font-semibold text-sm transition-all disabled:cursor-not-allowed cursor-pointer"
            >
              <span v-if="loading" class="flex items-center justify-center gap-2">
                <UIcon name="ph-circle-notch" class="w-4 h-4 animate-spin" />
                Joining...
              </span>
              <span v-else>Join Chat</span>
            </button>
          </form>
        </div>
      </div>

      <ChatLayout v-else />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { $auth } = useNuxtApp()
import { useToast } from './composables/useToast'
const toast = useToast()

const username = ref('')
const phoneNumber = ref('')
const loading = ref(false)
const loggedIn = ref(!!$auth.currentUser)

async function handleLogin() {
  if (!username.value.trim() || !phoneNumber.value.trim() || loading.value) return
  loading.value = true
  try {
    await $auth.login(username.value.trim(), phoneNumber.value.trim())
    loggedIn.value = true
  } catch (e: any) {
    toast.error({ title: 'Failed to login', description: e?.response?.data?.message })
  } finally {
    loading.value = false
  }
}
</script>
