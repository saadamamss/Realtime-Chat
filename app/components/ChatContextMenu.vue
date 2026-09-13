<template>
  <teleport to="body">
    <div v-if="show" class="fixed inset-0 z-40" @click="$emit('close')" />
    <div
      v-if="show"
      class="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 w-56"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <button
        v-if="chat?.phone_number"
        class="w-full px-4 py-2.5 text-left text-sm text-text-primary hover:bg-blue-50 flex items-center gap-3 cursor-pointer"
        @click="$emit('add-contact')"
      >
        <UIcon name="ph-user-plus" class="w-4 h-4 text-accent" />
        Add to Contact
      </button>
      <button
        class="w-full px-4 py-2.5 text-left text-sm text-text-primary hover:bg-blue-50 flex items-center gap-3 cursor-pointer"
        @click="$emit('wipe')"
      >
        <UIcon name="ph-trash" class="w-4 h-4 text-orange-500" />
        Wipe Conversation
      </button>
      <button
        class="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50 flex items-center gap-3 cursor-pointer"
        @click="$emit('delete')"
      >
        <UIcon name="ph-x-circle" class="w-4 h-4 text-danger" />
        Delete Conversation
      </button>
    </div>
  </teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  x: number
  y: number
  chat: any
}>()

defineEmits<{
  (e: 'add-contact'): void
  (e: 'wipe'): void
  (e: 'delete'): void
  (e: 'close'): void
}>()
</script>
