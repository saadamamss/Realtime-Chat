<template>
  <div class="h-screen flex bg-chat-bg" @mousemove="onMouseMove" @mouseup="onMouseUp">
    <!-- Backdrop for drawer mode -->
    <transition name="fade">
      <div
        v-if="isDrawer && drawerOpen"
        class="fixed inset-0 bg-black/40 z-20"
        @click="drawerOpen = false"
      />
    </transition>

    <!-- Sidebar -->
    <div
      ref="sidebarRef"
      :class="[
        'bg-surface border-r border-border flex flex-col shrink-0',
        isDrawer
          ? 'fixed left-0 top-0 bottom-0 z-30 transition-transform duration-300'
          : 'relative'
      ]"
      :style="isDrawer
        ? { width: sidebarWidth + 'px', transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }
        : { width: sidebarWidth + 'px' }"
    >

      <!-- ====== CHATS VIEW ====== -->
      <template v-if="sidebarView === 'chats'">
        <div class="px-4 py-3 border-b border-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="ph-chats" class="w-5 h-5 text-accent" />
              <span class="font-bold text-text-primary text-sm">Chat App</span>
            </div>
            <button
              @click="openContactPicker"
              class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              title="New Conversation"
            >
              <UIcon name="ph-pencil-line" class="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        <div class="px-4 py-2">
          <div class="relative">
            <UIcon name="ph-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search chats..."
              class="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="flex justify-center py-8">
            <UIcon name="ph-circle-notch" class="w-5 h-5 text-accent animate-spin" />
          </div>
          <div
            v-for="chat in filteredChats"
            :key="chat.id"
            @click="selectChat(chat)"
            @contextmenu.prevent="openContextMenu($event, chat)"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
            :class="currentConversationId === chat.id ? 'bg-gray-100' : ''"
          >
            <img
              :src="chat.image || ''"
              :alt="chat.displayName"
              class="w-12 h-12 rounded-full object-cover shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-text-primary truncate">{{ chat.displayName }}</p>
                <span
                  v-if="$ws.isOnline(chat.otherId)"
                  class="w-1.5 h-1.5 rounded-full bg-success shrink-0"
                  title="Online"
                />
              </div>
              <p class="text-xs text-text-secondary truncate mt-0.5">{{ chat.last_message || 'No messages yet' }}</p>
            </div>
            <button
              @click.stop="openContextMenu($event, chat)"
              class="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UIcon name="ph-dots-three-vertical" class="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          <!-- Context Menu -->
          <teleport to="body">
            <div
              v-if="contextMenu.show"
              class="fixed inset-0 z-50"
              @click="closeContextMenu"
            >
              <div
                class="absolute bg-surface rounded-xl shadow-xl border border-border py-1 w-56"
                :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
                @click.stop
              >
                <button
                  v-if="contextMenu.chat && !contactIds.has(contextMenu.chat.otherId)"
                  @click="addContactFromChat"
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 text-left transition-colors"
                >
                  <UIcon name="ph-user-plus" class="w-4 h-4 text-text-secondary" />
                  Add to Contact
                </button>
                <button
                  @click="wipeChat"
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 text-left transition-colors"
                >
                  <UIcon name="ph-broom" class="w-4 h-4 text-text-secondary" />
                  Wipe Conversation
                </button>
                <button
                  @click="deleteChat"
                  class="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 text-left transition-colors"
                >
                  <UIcon name="ph-trash" class="w-4 h-4" />
                  Delete Conversation
                </button>
              </div>
            </div>
          </teleport>
          <div v-if="!loading && filteredChats.length === 0" class="text-center py-8 text-text-secondary text-sm">
            No chats yet
          </div>
        </div>
      </template>

      <!-- ====== CONTACT PICKER VIEW ====== -->
      <template v-else-if="sidebarView === 'contacts'">
        <div class="px-4 py-3 border-b border-border">
          <div class="flex items-center gap-3">
            <button
              @click="sidebarView = 'chats'"
              class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            >
              <UIcon name="ph-arrow-left" class="w-5 h-5 text-text-secondary" />
            </button>
            <span class="font-bold text-text-primary text-sm">New Conversation</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <!-- Add New Contact row -->
          <div
            @click="sidebarView = 'add-contact'"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-border"
          >
            <div class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <UIcon name="ph-user-plus" class="w-5 h-5 text-accent" />
            </div>
            <p class="text-sm font-medium text-accent">Add New Contact</p>
          </div>

          <!-- Contact list -->
          <div
            v-for="contact in contactList"
            :key="contact.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
            @click="selectContact(contact)"
          >
            <img
              :src="contact.image || ''"
              :alt="contact.name"
              class="w-12 h-12 rounded-full object-cover shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text-primary truncate">{{ contact.name }}</p>
              <p class="text-xs text-text-secondary truncate mt-0.5">{{ contact.phone_number }}</p>
            </div>
            <button
              @click.stop="removeContact(contact)"
              class="w-7 h-7 rounded-full hover:bg-danger/10 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove contact"
            >
              <UIcon name="ph-trash" class="w-4 h-4 text-danger" />
            </button>
          </div>

          <div v-if="contactList.length === 0" class="text-center py-8 text-text-secondary text-sm">
            No contacts yet.<br />Add a contact to start a conversation.
          </div>
        </div>
      </template>

      <!-- ====== ADD CONTACT FORM VIEW ====== -->
      <template v-else-if="sidebarView === 'add-contact'">
        <div class="px-4 py-3 border-b border-border">
          <div class="flex items-center gap-3">
            <button
              @click="sidebarView = 'contacts'"
              class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer"
            >
              <UIcon name="ph-arrow-left" class="w-5 h-5 text-text-secondary" />
            </button>
            <span class="font-bold text-text-primary text-sm">Add Contact</span>
          </div>
        </div>

        <div class="p-4">
          <input
            v-model="contactPhone"
            type="tel"
            placeholder="Enter phone number..."
            class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm text-text-primary placeholder-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all mb-3"
            @keydown.enter.prevent="addContactByPhone"
          />
          <p v-if="addContactError" class="text-xs text-danger mb-3">{{ addContactError }}</p>
          <button
            @click="addContactByPhone"
            :disabled="!contactPhone.trim() || addingContact"
            class="w-full py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-gray-200 text-white font-semibold text-sm transition-all disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="addingContact" class="flex items-center justify-center gap-2">
              <UIcon name="ph-circle-notch" class="w-4 h-4 animate-spin" />
              Adding...
            </span>
            <span v-else>Add</span>
          </button>
        </div>
      </template>
    </div>

    <!-- Resize handle (only in non-drawer mode) -->
    <div
      v-if="!isDrawer"
      class="w-1.5 shrink-0 cursor-col-resize hover:bg-accent/20 transition-colors relative group"
      @mousedown="onResizeStart"
    >
      <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-border group-hover:bg-accent/40 transition-colors" />
    </div>

    <!-- Chat area -->
    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="currentConversationId">
        <div class="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border shrink-0">
          <button
            v-if="isDrawer"
            @click="drawerOpen = true"
            class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer shrink-0"
          >
            <UIcon name="ph-list" class="w-5 h-5 text-text-secondary" />
          </button>
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <img
              :src="activeChat?.image || ''"
              :alt="activeChat?.displayName || 'Chat'"
              class="w-10 h-10 rounded-full object-cover shrink-0"
            />
            <div class="min-w-0">
              <p class="font-semibold text-text-primary text-sm truncate">{{ activeChat?.displayName || 'Select a chat' }}</p>
              <p v-if="activeChat" class="text-xs" :class="$ws.isOnline(activeChat.otherId) ? 'text-success' : 'text-text-secondary'">
                {{ $ws.isOnline(activeChat.otherId) ? 'Online' : 'Offline' }}
              </p>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer shrink-0"
            title="Logout"
          >
            <UIcon name="ph-sign-out" class="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div class="flex-1 min-h-0">
          <ObayhChat :key="chatKey" :conversation-id="currentConversationId" @loaded="chatLoaded = true" />
        </div>
      </template>

      <template v-else>
        <div class="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-[#e8f0fe] via-white to-[#fce8e8] relative">
          <div class="absolute top-4 left-4 flex items-center gap-2">
            <button
              v-if="isDrawer"
              @click="drawerOpen = true"
              class="w-10 h-10 rounded-xl bg-white shadow-md border border-border flex items-center justify-center hover:bg-gray-50 cursor-pointer"
            >
              <UIcon name="ph-list" class="w-5 h-5 text-text-primary" />
            </button>
          </div>
          <button
            @click="handleLogout"
            class="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white shadow-md border border-border flex items-center justify-center hover:bg-gray-50 cursor-pointer"
            title="Logout"
          >
            <UIcon name="ph-sign-out" class="w-5 h-5 text-text-primary" />
          </button>
          <div class="text-center max-w-md">
            <div class="w-56 h-56 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-accent/20 ring-4 ring-accent/10">
              <UIcon name="ph-chats" class="w-28 h-28 text-white" />
            </div>
            <h2 class="text-3xl font-extrabold text-text-primary mb-3 tracking-tight">Welcome to Chat App</h2>
            <p class="text-text-secondary text-base leading-relaxed max-w-xs mx-auto">
              Select a conversation from the sidebar to start messaging, or click the pencil icon to begin a new chat with a contact.
            </p>
            <div class="flex items-center justify-center gap-6 mt-10">
              <div class="flex flex-col items-center gap-1.5">
                <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <UIcon name="ph-pencil-line" class="w-5 h-5 text-accent" />
                </div>
                <span class="text-xs text-text-secondary font-medium">New Chat</span>
              </div>
              <div class="flex flex-col items-center gap-1.5">
                <div class="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <UIcon name="ph-chat-text" class="w-5 h-5 text-success" />
                </div>
                <span class="text-xs text-text-secondary font-medium">Messages</span>
              </div>
              <div class="flex flex-col items-center gap-1.5">
                <div class="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <UIcon name="ph-users" class="w-5 h-5 text-warning" />
                </div>
                <span class="text-xs text-text-secondary font-medium">Contacts</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $axios, $auth, $ws } = useNuxtApp()

const SIDEBAR_MIN = 260
const CHAT_MIN = 500
const SIDEBAR_DEFAULT = 340

const sidebarView = ref<'chats' | 'contacts' | 'add-contact'>('chats')
const searchQuery = ref('')
const chats = ref<any[]>([])
const contactList = ref<any[]>([])
const contactIds = ref<Set<string>>(new Set())
const loading = ref(false)
const currentConversationId = ref('')
const chatLoaded = ref(false)

const chatKey = ref(0)

const contextMenu = reactive({ show: false, x: 0, y: 0, chat: null as any })

const sidebarWidth = ref(SIDEBAR_DEFAULT)
const isDragging = ref(false)
const drawerOpen = ref(false)
const windowWidth = ref(0)

const contactPhone = ref('')
const addingContact = ref(false)
const addContactError = ref('')

const isDrawer = computed(() => SIDEBAR_MIN + CHAT_MIN > windowWidth.value)

const filteredChats = computed(() => {
  if (!searchQuery.value.trim()) return chats.value
  const q = searchQuery.value.toLowerCase()
  return chats.value.filter((c) => c.displayName.toLowerCase().includes(q))
})

const activeChat = computed(() => {
  return chats.value.find((c) => c.id === currentConversationId.value) || null
})

function openContactPicker() {
  sidebarView.value = 'contacts'
  if (isDrawer.value) drawerOpen.value = true
}

function displayName(other: any) {
  if (!other) return 'Unknown'
  return contactIds.value.has(other.id) ? other.name : (other.phone_number || other.name)
}

function onResizeStart(e: MouseEvent) {
  isDragging.value = true
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  let w = e.clientX
  if (w < SIDEBAR_MIN) w = SIDEBAR_MIN
  const maxW = windowWidth.value - CHAT_MIN
  if (w > maxW) w = maxW
  sidebarWidth.value = w
}

function onMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
    localStorage.setItem('sidebar_width', String(sidebarWidth.value))
  }
}

async function addContactByPhone() {
  if (!contactPhone.value.trim() || addingContact.value) return
  addingContact.value = true
  addContactError.value = ''
  try {
    const { data } = await $axios.post('/contacts', { phone_number: contactPhone.value.trim() })
    contactIds.value.add(data.contact.id)
    contactList.value.push(data.contact)
    contactPhone.value = ''
    sidebarView.value = 'contacts'
  } catch (e: any) {
    addContactError.value = e?.response?.data?.message || 'Failed to add contact'
  } finally {
    addingContact.value = false
  }
}

async function removeContact(contact: any) {
  try {
    await $axios.delete('/contacts', { data: { contact_id: contact.id } })
    contactList.value = contactList.value.filter((c) => c.id !== contact.id)
    contactIds.value.delete(contact.id)
    for (const chat of chats.value) {
      if (chat.otherId === contact.id) {
        chat.displayName = contact.phone_number || contact.name
      }
    }
    if (activeChat.value?.otherId === contact.id && activeChat.value) {
      activeChat.value.displayName = contact.phone_number || contact.name
    }
  } catch (e: any) {
    console.error('Failed to remove contact', e)
  }
}

async function selectContact(contact: any) {
  sidebarView.value = 'chats'

  const existing = chats.value.find((c) => c.otherId === contact.id)
  if (existing) {
    currentConversationId.value = existing.id
    return
  }

  try {
    const { data } = await $axios.post('/conversations', { contact_id: contact.id })
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
  } catch (e: any) {
    console.error('Failed to create conversation', e)
  }
}

async function selectChat(chat: any) {
  if (isDrawer.value) drawerOpen.value = false
  try {
    const { data } = await $axios.post('/conversations', { contact_id: chat.otherId })
    currentConversationId.value = data.conversation.id
  } catch (e: any) {
    console.error('Failed to create conversation', e)
  }
}

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

async function addContactFromChat() {
  if (!contextMenu.chat) return
  const chat = contextMenu.chat
  closeContextMenu()
  try {
    const { data } = await $axios.post('/contacts', { phone_number: chat.phone_number })
    contactIds.value.add(data.contact.id)
    chat.displayName = data.contact.name
    contactList.value.push(data.contact)
  } catch (e: any) {
    console.error('Failed to add contact', e)
  }
}

async function wipeChat() {
  if (!contextMenu.chat) return
  const convId = contextMenu.chat.id
  closeContextMenu()
  try {
    await $axios.post('/conversations/wipe', { conversation_id: convId })
    chatKey.value++
    const chat = chats.value.find((c) => c.id === convId)
    if (chat) chat.last_message = ''
  } catch (e: any) {
    console.error('Failed to wipe conversation', e)
  }
}

async function deleteChat() {
  if (!contextMenu.chat) return
  const convId = contextMenu.chat.id
  closeContextMenu()
  currentConversationId.value = ''
  try {
    await $axios.delete('/conversations', { data: { conversation_id: convId } })
    chats.value = chats.value.filter((c) => c.id !== convId)
  } catch (e: any) {
    console.error('Failed to delete conversation', e)
  }
}

function handleLogout() {
  $auth.logout()
  window.location.reload()
}

function onResize() {
  windowWidth.value = window.innerWidth
  if (!isDrawer.value) {
    const maxW = window.innerWidth - CHAT_MIN
    if (sidebarWidth.value > maxW) sidebarWidth.value = maxW
  }
}

async function loadData() {
  try {
    loading.value = true
    const [contactsRes, convsRes] = await Promise.all([
      $axios.get('/contacts'),
      $axios.get('/conversations'),
    ])

    const myContacts: any[] = contactsRes.data.contacts || []
    contactList.value = myContacts
    contactIds.value = new Set(myContacts.map((c: any) => c.id))

    const convs: any[] = convsRes.data.conversations || []
    chats.value = convs.map((conv) => {
      const other = conv.other_participant || {}
      return {
        id: conv.id,
        otherId: other.id,
        displayName: displayName(other),
        image: other.image || '',
        phone_number: other.phone_number || '',
        last_message: conv.last_message || '',
        last_message_at: conv.last_message_at || '',
      }
    })
  } catch (e) {
    console.error('Failed to load data', e)
  } finally {
    loading.value = false
  }
}

const onWsMessage = (data: any) => {
  if (data.type === 'new-message' && data.conversation_id) {
    const exists = chats.value.some((c) => c.id === data.conversation_id)
    if (!exists) {
      loadData()
    } else {
      const chat = chats.value.find((c) => c.id === data.conversation_id)
      if (chat) chat.last_message = data.message?.content || ''
    }
  }
}

onMounted(async () => {
  windowWidth.value = window.innerWidth
  const saved = localStorage.getItem('sidebar_width')
  if (saved) sidebarWidth.value = Math.max(SIDEBAR_MIN, parseInt(saved))

  window.addEventListener('resize', onResize)

  await loadData()

  $ws.connect($auth.currentUser?.id)
  $ws.onMessage(onWsMessage)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  $ws.offMessage(onWsMessage)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
