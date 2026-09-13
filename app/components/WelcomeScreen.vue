<template>
  <div class="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
    <button
      v-if="isDrawer"
      class="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition-colors cursor-pointer z-10"
      @click="$emit('toggle-drawer')"
    >
      <UIcon name="ph-list" class="w-5 h-5 text-text-primary" />
    </button>

    <button
      class="absolute top-4 right-4 px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-sm text-text-secondary shadow-sm transition-colors cursor-pointer"
      @click="$emit('logout')"
    >
      Logout
    </button>

    <div class="flex flex-col items-center text-center max-w-md px-6">
      <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
        <UIcon name="ph-chat-circle-dots-fill" class="w-10 h-10 text-white" />
      </div>
      <h1 class="text-2xl font-bold text-text-primary mb-2">Welcome to Chat</h1>
      <p class="text-text-secondary text-sm leading-relaxed mb-8">
        Select a conversation from the sidebar or start a new one to begin messaging.
      </p>
      <div class="flex gap-8">
        <div class="flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <UIcon name="ph-chat-circle" class="w-6 h-6 text-accent" />
          </div>
          <span class="text-xs text-text-secondary">New Chat</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <UIcon name="ph-paper-plane-tilt" class="w-6 h-6 text-purple-600" />
          </div>
          <span class="text-xs text-text-secondary">Messages</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <UIcon name="ph-users-three" class="w-6 h-6 text-green-600" />
          </div>
          <span class="text-xs text-text-secondary">Contacts</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDrawer: boolean
}>()

defineEmits<{
  (e: 'logout'): void
  (e: 'toggle-drawer'): void
}>()
</script>
