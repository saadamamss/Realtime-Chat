import { reactive } from 'vue'

export default defineNuxtPlugin(() => {
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let currentConversationId: string | null = null
  let currentToken: string | null = null
  const messageHandlers: Set<(data: any) => void> = new Set()

  const state = reactive<{ connected: boolean }>({
    connected: false,
  })

  const onlineUsers = reactive<Set<string>>(new Set())

  async function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

    try {
      const res = await fetch('/api/auth/token', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      currentToken = data.token
    } catch {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`

    ws = new WebSocket(url)

    ws.onopen = () => {
      state.connected = true
      if (currentToken) {
        send({ type: 'authenticate', token: currentToken })
      }
      if (currentConversationId) {
        send({ type: 'join', conversationId: currentConversationId })
      }
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'presence-snapshot' && data.userIds) {
          onlineUsers.clear()
          for (const id of data.userIds) {
            onlineUsers.add(id)
          }
        } else if (data.type === 'user-online' && data.userId) {
          onlineUsers.add(data.userId)
        } else if (data.type === 'user-offline' && data.userId) {
          onlineUsers.delete(data.userId)
        } else if (data.type === 'error') {
          if (data.message === 'Invalid token' || data.message === 'Not authenticated') {
            currentToken = null
            ws?.close()
          }
          return
        } else if (data.type === 'pong') {
          return
        }
        for (const handler of messageHandlers) handler(data)
      } catch {
        // ignore
      }
    }

    ws.onclose = () => {
      state.connected = false
      onlineUsers.clear()
      stopHeartbeat()
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      send({ type: 'ping' })
    }, 30000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 3000)
  }

  function send(data: Record<string, unknown>) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  function onMessage(callback: (data: any) => void) {
    messageHandlers.add(callback)
  }
  function offMessage(callback: (data: any) => void) {
    messageHandlers.delete(callback)
  }

  function joinConversation(conversationId: string) {
    currentConversationId = conversationId
    send({ type: 'join', conversationId })
  }

  function leaveConversation(conversationId: string) {
    send({ type: 'leave', conversationId })
    currentConversationId = null
  }

  function isOnline(userId: string) {
    return onlineUsers.has(userId)
  }

  function disconnect() {
    currentToken = null
    ws?.close()
    ws = null
  }

  return {
    provide: {
      ws: {
        get connected() {
          return state.connected
        },
        get onlineUsers() {
          return onlineUsers
        },
        connect,
        disconnect,
        send,
        onMessage,
        offMessage,
        joinConversation,
        leaveConversation,
        isOnline,
      },
    },
  }
})
