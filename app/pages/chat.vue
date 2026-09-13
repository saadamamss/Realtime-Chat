<template>
  <ClientOnly>
    <ChatLayout />
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'auth',
})
</script>
