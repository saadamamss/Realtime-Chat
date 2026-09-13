import { defineStore } from 'pinia'
import type { ChatData, ChatMessage, PendingUpload, SocketMessage } from '../types'

export const useChatStore = defineStore('chat', () => {
  const chats = ref<any[]>([])
  const loading = ref(false)
  const currentConversationId = ref('')
  const chatLoaded = ref(false)
  const chatKey = ref(0)
  const chatData = ref<ChatData>({})
  const pendingMessages = ref<Record<string, PendingUpload>>({})
  const loadingLastMessages = ref(false)
  const loadingOldMessages = ref(false)
  const hasMoreOldMessages = ref(false)
  const chatCurrentPage = ref(1)
  const scrollPositionBeforeLoad = ref(0)
  const typingUsers = ref<Set<string>>(new Set())
  const unreadBadgeCount = ref(0)

  const filteredChats = computed(() => chats.value)

  const sortedDates = computed(() => {
    if (!chatData.value) return []
    return Object.keys(chatData.value).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  })

  let axios: any = null
  let authStore: any = null

  function setAxios(instance: any) {
    axios = instance
  }

  function setAuthStore(store: any) {
    authStore = store
  }

  async function loadData() {
    try {
      loading.value = true
      const [contactsRes, convsRes] = await Promise.all([
        axios.get('/contacts'),
        axios.get('/conversations'),
      ])

      const convs: any[] = convsRes.data.conversations || []
      chats.value = convs.map((conv) => {
        const other = conv.other_participant || {}
        return {
          id: conv.id,
          otherId: other.id,
          displayName: other.name,
          image: other.image || '',
          phone_number: other.phone_number || '',
          last_message: conv.last_message || '',
          last_message_at: conv.last_message_at || '',
          unreadCount: conv.unread_count || 0,
        }
      })
    } catch {
      // handled by caller
    } finally {
      loading.value = false
    }
  }

  const onWsMessage = (data: SocketMessage & { message?: any }) => {
    if (data.type === 'new-message' && data.conversation_id) {
      const exists = chats.value.some((c) => c.id === data.conversation_id)
      if (!exists) {
        loadData()
      } else {
        const chat = chats.value.find((c) => c.id === data.conversation_id)
        if (chat) {
          chat.last_message = data.message?.content || ''
          if (data.message?.sender?.id !== authStore?.currentUser?.id && data.conversation_id !== currentConversationId.value) {
            chat.unreadCount = (chat.unreadCount || 0) + 1
          }
        }
      }
    }
  }

  async function selectChat(chat: any) {
    chat.unreadCount = 0
    try {
      const { data } = await axios.post('/conversations', { contact_id: chat.otherId })
      currentConversationId.value = data.conversation.id
    } catch {
      // handled by caller
    }
  }

  async function selectContact(contact: any, chatsList: any[]) {
    const existing = chatsList.find((c) => c.otherId === contact.id)
    if (existing) {
      currentConversationId.value = existing.id
      return
    }

    try {
      const { data } = await axios.post('/conversations', { contact_id: contact.id })
      const conv = data.conversation
      chats.value.unshift({
        id: conv.id,
        otherId: contact.id,
        displayName: contact.name,
        image: contact.image || '',
        last_message: '',
        last_message_at: '',
      })
      currentConversationId.value = conv.id
    } catch {
      // handled by caller
    }
  }

  async function addContactFromChat(chat: any, contactIds: Set<string>, addContactFn: (phone: string) => Promise<any>) {
    if (contactIds.has(chat.otherId)) return
    try {
      const contact = await addContactFn(chat.phone_number)
      if (contact) {
        chat.displayName = contact.name
      }
    } catch {
      // handled by caller
    }
  }

  async function wipeChat(chat: any) {
    const convId = chat.id
    try {
      await axios.post('/conversations/wipe', { conversation_id: convId })
      chatKey.value++
      const found = chats.value.find((c) => c.id === convId)
      if (found) found.last_message = ''
    } catch {
      // handled by caller
    }
  }

  async function deleteChat(chat: any) {
    const convId = chat.id
    currentConversationId.value = ''
    try {
      await axios.delete('/conversations', { data: { conversation_id: convId } })
      chats.value = chats.value.filter((c) => c.id !== convId)
    } catch {
      // handled by caller
    }
  }

  function updateChatDisplayNames(contactIds: Set<string>, contactList: any[]) {
    for (const chat of chats.value) {
      if (contactIds.has(chat.otherId)) {
        const contact = contactList.find((c: any) => c.id === chat.otherId)
        if (contact) chat.displayName = contact.name
      }
    }
  }

  function resetChatData() {
    chatData.value = {}
    chatCurrentPage.value = 1
    hasMoreOldMessages.value = false
  }

  function reset() {
    chats.value = []
    loading.value = false
    currentConversationId.value = ''
    chatLoaded.value = false
    chatKey.value = 0
    chatData.value = {}
    pendingMessages.value = {}
    typingUsers.value = new Set()
    unreadBadgeCount.value = 0
  }

  return {
    chats,
    loading,
    currentConversationId,
    chatLoaded,
    chatKey,
    chatData,
    pendingMessages,
    loadingLastMessages,
    loadingOldMessages,
    hasMoreOldMessages,
    chatCurrentPage,
    scrollPositionBeforeLoad,
    typingUsers,
    unreadBadgeCount,
    filteredChats,
    sortedDates,
    setAxios,
    setAuthStore,
    loadData,
    onWsMessage,
    selectChat,
    selectContact,
    addContactFromChat,
    wipeChat,
    deleteChat,
    updateChatDisplayNames,
    resetChatData,
    reset,
  }
})
