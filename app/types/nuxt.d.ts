declare module '#app' {
  interface NuxtApp {
    $axios: {
      get: <T = any>(url: string, config?: any) => Promise<{ data: T }>
      post: <T = any>(url: string, data?: any, config?: any) => Promise<{ data: T }>
    }
    $auth: {
      currentUser: { id: string; username: string; avatar: string } | null
      loggedIn: boolean
      login: (username: string, phoneNumber: string, password: string, mode?: 'login' | 'register') => Promise<{ id: string; username: string; phone_number: string; avatar: string }>
      logout: () => Promise<void>
      fetchUser: () => Promise<void>
    }
    $ws: {
      connected: boolean
      onlineUsers: Set<string>
      connect: () => void
      disconnect: () => void
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
    $auth: {
      currentUser: { id: string; username: string; avatar: string } | null
      loggedIn: boolean
    }
    $ws: {
      connected: boolean
      onlineUsers: Set<string>
      connect: () => void
      disconnect: () => void
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
