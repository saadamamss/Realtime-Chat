<template>
  <div class="flex h-screen bg-chat-bg overflow-hidden" @mousemove="onMouseMove" @mouseup="onMouseUp">
    <Transition name="backdrop">
      <div v-if="isDrawer && drawerOpen" class="fixed inset-0 bg-black/50 z-40" @click="drawerOpen = false" />
    </Transition>

    <Transition name="drawer">
      <div
        v-show="!isDrawer || drawerOpen"
        class="bg-surface border-r border-gray-200 flex flex-col h-full relative z-50 shrink-0"
        :class="isDrawer ? 'fixed inset-y-0 left-0 w-80 shadow-2xl' : ''"
        :style="isDrawer ? {} : { width: sidebarWidth + 'px' }"
      >
      <div v-if="sidebarView === 'chats'">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h1 class="text-lg font-bold text-text-primary">Chats</h1>
          <button
            class="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            @click="sidebarView = 'contacts'"
          >
            <UIcon name="ph-plus" class="w-5 h-5 text-white" />
          </button>
        </div>

        <div class="px-3 py-2">
          <div class="relative">
            <UIcon name="ph-magnifying-glass" class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              placeholder="Search chats..."
              class="w-full bg-blue-50 rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 border-2 border-blue-200 focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div
            v-for="chat in filteredChats"
            :key="chat.id"
            class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
            :class="chatStore.currentConversationId === chat.id ? 'bg-blue-50' : ''"
            @click="handleSelectChat(chat)"
            @contextmenu.prevent="openContextMenu($event, chat)"
          >
            <div class="relative shrink-0">
              <img :src="chat.image" class="w-10 h-10 rounded-full object-cover" />
              <span
                v-if="wsStore.isOnline(chat.otherId)"
                class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-text-primary truncate">{{ chat.displayName }}</span>
                <span class="text-[10px] text-text-secondary shrink-0 ml-2">{{ chat.last_message_at ? formatTime(chat.last_message_at) : '' }}</span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-xs text-text-secondary truncate">{{ chat.last_message || 'No messages yet' }}</span>
                <span
                  v-if="chat.unreadCount > 0"
                  class="ml-2 shrink-0 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                >
                  {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="!chatStore.loading && filteredChats.length === 0" class="text-center py-12 text-text-secondary">
            <UIcon name="ph-magnifying-glass" class="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p class="text-sm">No chats found</p>
          </div>
        </div>
      </div>

      <div v-else-if="sidebarView === 'contacts'">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <button class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer" @click="sidebarView = 'chats'">
            <UIcon name="ph-arrow-left" class="w-5 h-5 text-text-primary" />
          </button>
          <h1 class="text-lg font-bold text-text-primary">New Conversation</h1>
        </div>

        <div class="px-3 py-2 border-b border-gray-200">
          <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer text-left"
            @click="sidebarView = 'add-contact'"
          >
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <UIcon name="ph-user-plus" class="w-5 h-5 text-accent" />
            </div>
            <span class="text-sm font-medium text-accent">Add New Contact</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div
            v-for="contact in contactsStore.contactList"
            :key="contact.id"
            class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors group"
            @click="handleSelectContact(contact)"
          >
            <img :src="contact.image" class="w-10 h-10 rounded-full object-cover shrink-0" />
            <div class="flex-1 min-w-0">
              <span class="text-sm font-semibold text-text-primary truncate block">{{ contact.name }}</span>
              <span class="text-xs text-text-secondary truncate block">{{ contact.phone_number }}</span>
            </div>
            <button
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
              @click.stop="handleRemoveContact(contact)"
            >
              <UIcon name="ph-trash" class="w-4 h-4 text-danger" />
            </button>
          </div>

          <div v-if="!chatStore.loading && contactsStore.contactList.length === 0" class="text-center py-12 text-text-secondary">
            <UIcon name="ph-users" class="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p class="text-sm">No contacts yet</p>
          </div>
        </div>
      </div>

      <div v-else-if="sidebarView === 'add-contact'">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <button class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer" @click="sidebarView = 'contacts'">
            <UIcon name="ph-arrow-left" class="w-5 h-5 text-text-primary" />
          </button>
          <h1 class="text-lg font-bold text-text-primary">Add Contact</h1>
        </div>

        <div class="p-4">
          <label class="text-xs font-medium text-text-secondary mb-1.5 block">Phone Number</label>
          <input
            v-model="contactsStore.contactPhone"
            placeholder="+1-555-0123"
            class="w-full bg-blue-50 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 border-2 border-blue-200 focus:border-blue-400 transition-colors"
            @keydown.enter="handleAddContact"
          />
          <p v-if="contactsStore.addContactError" class="text-xs text-danger mt-1.5">{{ contactsStore.addContactError }}</p>
          <button
            class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!contactsStore.contactPhone.trim() || contactsStore.addingContact"
            @click="handleAddContact"
          >
            <UIcon v-if="contactsStore.addingContact" name="ph-circle-notch" class="w-4 h-4 animate-spin" />
            {{ contactsStore.addingContact ? 'Adding...' : 'Add Contact' }}
          </button>
        </div>
      </div>
    </div>
    </Transition>

    <div
      v-if="!isDrawer"
      class="w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors shrink-0"
      @mousedown="onResizeStart"
    />

    <div class="flex-1 flex flex-col min-w-0 h-full">
      <template v-if="chatStore.currentConversationId">
        <div class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-surface shrink-0">
          <button v-if="isDrawer" class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer" @click="chatStore.currentConversationId = ''; drawerOpen = true">
            <UIcon name="ph-arrow-left" class="w-5 h-5 text-text-primary" />
          </button>
          <div class="relative shrink-0" v-if="activeChat">
            <img :src="activeChat.image" class="w-9 h-9 rounded-full object-cover" />
            <span
              v-if="wsStore.isOnline(activeChat.otherId)"
              class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-sm font-semibold text-text-primary truncate">{{ activeChat?.displayName }}</h2>
            <p class="text-[11px] text-text-secondary">
              <template v-if="activeChat && wsStore.isOnline(activeChat.otherId)">Online</template>
              <template v-else>Offline</template>
            </p>
          </div>
          <button
            class="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm text-text-secondary transition-colors cursor-pointer"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
        <ChatMessages :key="chatStore.chatKey" :conversation-id="chatStore.currentConversationId" @loaded="chatStore.chatLoaded = true" />
      </template>

      <template v-else>
        <WelcomeScreen :is-drawer="isDrawer" @logout="handleLogout" @toggle-drawer="drawerOpen = !drawerOpen" />
      </template>
    </div>

    <ChatContextMenu :show="contextMenu.show" :x="contextMenu.x" :y="contextMenu.y" :chat="contextMenu.chat" @add-contact="() => handleAddContactFromChat(contextMenu.chat)" @wipe="() => handleWipeChat(contextMenu.chat)" @delete="() => handleDeleteChat(contextMenu.chat)" @close="closeContextMenu" />
  </div>
</template>

<script setup lang="ts">
import { useSidebarResize } from '../composables/useSidebarResize'
import { useAppToast } from '../composables/useAppToast'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useContactsStore } from '../stores/contacts'
import { useWsStore } from '../stores/ws'
import { formatTime } from '../utils/format'

const authStore = useAuthStore()
const chatStore = useChatStore()
const contactsStore = useContactsStore()
const wsStore = useWsStore()
const toast = useAppToast()
const router = useRouter()

const {
  sidebarWidth, isDragging, windowWidth, isDrawer,
  onResizeStart, onMouseMove, onMouseUp, initResize, cleanupResize,
} = useSidebarResize()

const sidebarView = ref<'chats' | 'contacts' | 'add-contact'>('chats')
const searchQuery = ref('')
const drawerOpen = ref(false)
const contextMenu = reactive({ show: false, x: 0, y: 0, chat: null as any })

const filteredChats = computed(() => {
  return chatStore.chats
})

const activeChat = computed(() => {
  return chatStore.chats.find((c: any) => c.id === chatStore.currentConversationId) || null
})

function openContextMenu(e: MouseEvent, chat: any) {
  const sidebar = document.querySelector('.bg-surface.border-r')
  if (!sidebar) return
  const rect = sidebar.getBoundingClientRect()
  const menuW = 224
  const menuH = 88
  let x = e.clientX - rect.left
  let y = e.clientY - rect.top
  if (x + menuW > rect.width) x = rect.width - menuW - 8
  if (y + menuH > rect.height) y = rect.height - menuH - 8
  if (x < 8) x = 8
  if (y < 8) y = 8
  contextMenu.x = x
  contextMenu.y = y
  contextMenu.chat = chat
  contextMenu.show = true
}

function closeContextMenu() {
  contextMenu.show = false
  contextMenu.chat = null
}

async function handleSelectChat(chat: any) {
  chat.unreadCount = 0
  try {
    const { data } = await useNuxtApp().$axios.post('/conversations', { contact_id: chat.otherId })
    chatStore.currentConversationId = data.conversation.id
    if (isDrawer.value) drawerOpen.value = false
  } catch {
    toast.error({ title: 'Failed to open conversation' })
  }
}

async function handleSelectContact(contact: any) {
  const existing = chatStore.chats.find((c) => c.otherId === contact.id)
  if (existing) {
    chatStore.currentConversationId = existing.id
  } else {
    try {
      const { data } = await useNuxtApp().$axios.post('/conversations', { contact_id: contact.id })
      const conv = data.conversation
      chatStore.chats.unshift({
        id: conv.id,
        otherId: contact.id,
        displayName: contact.name,
        image: contact.image || '',
        last_message: '',
        last_message_at: '',
      })
      chatStore.currentConversationId = conv.id
    } catch {
      toast.error({ title: 'Failed to start conversation' })
    }
  }
  if (isDrawer.value) drawerOpen.value = false
}

async function handleAddContact() {
  await contactsStore.addContactByPhone()
  if (!contactsStore.addContactError) {
    chatStore.updateChatDisplayNames(contactsStore.contactIds, contactsStore.contactList)
  }
}

async function handleRemoveContact(contact: any) {
  await contactsStore.removeContact(contact)
  chatStore.updateChatDisplayNames(contactsStore.contactIds, contactsStore.contactList)
}

async function handleAddContactFromChat(chat: any) {
  if (contactsStore.contactIds.has(chat.otherId)) return
  try {
    const { data } = await useNuxtApp().$axios.post('/contacts', { phone_number: chat.phone_number })
    contactsStore.contactIds.add(data.contact.id)
    chat.displayName = data.contact.name
    contactsStore.contactList.push(data.contact)
  } catch {
    toast.error({ title: 'Failed to add contact' })
  }
}

async function handleWipeChat(chat: any) {
  await chatStore.wipeChat(chat)
}

async function handleDeleteChat(chat: any) {
  await chatStore.deleteChat(chat)
}

function handleLogout() {
  authStore.logout()
  wsStore.reset()
  chatStore.reset()
  contactsStore.reset()
  router.replace('/login')
}

onMounted(async () => {
  initResize()
  await chatStore.loadData()
  wsStore.connect()
  wsStore.onMessage(chatStore.onWsMessage)
})

onUnmounted(() => {
  cleanupResize()
  wsStore.offMessage(chatStore.onWsMessage)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.3s ease; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

.drawer-enter-active { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-leave-active { transition: transform 0.2s ease-in; }
.drawer-enter-from, .drawer-leave-to { transform: translateX(-100%); }
</style>
