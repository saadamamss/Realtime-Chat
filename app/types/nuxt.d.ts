import type { AxiosInstance } from 'axios'

declare module '#app' {
  interface NuxtApp {
    $axios: AxiosInstance
    $auth: {
      currentUser: { id: string; username: string; avatar: string } | null
      login: (username: string, phoneNumber: string) => Promise<{ id: string; username: string; phone_number: string; avatar: string }>
      logout: () => void
    }
    $ws: {
      connected: boolean
      onlineUsers: Set<string>
      connect: (userId?: string) => void
      send: (data: Record<string, unknown>) => void
      onMessage: (callback: (data: any) => void) => void
      offMessage: (callback: (data: any) => void) => void
      joinConversation: (conversationId: string) => void
      leaveConversation: (conversationId: string) => void
      isOnline: (userId: string) => boolean
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance
    $auth: {
      currentUser: { id: string; username: string; avatar: string } | null
    }
    $ws: {
      connected: boolean
      onlineUsers: Set<string>
      connect: (userId?: string) => void
      send: (data: Record<string, unknown>) => void
      onMessage: (callback: (data: any) => void) => void
      offMessage: (callback: (data: any) => void) => void
      joinConversation: (conversationId: string) => void
      leaveConversation: (conversationId: string) => void
      isOnline: (userId: string) => boolean
    }
  }
}

export {}
