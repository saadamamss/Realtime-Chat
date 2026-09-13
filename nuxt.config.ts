export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  ssr: false,
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  },
})
