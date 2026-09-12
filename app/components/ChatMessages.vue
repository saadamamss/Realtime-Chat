<template>
  <div class="flex flex-col h-full">
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-chat-bg scroll-smooth relative"
      @scroll="handleMessageContainerScroll"
    >
      <div
        v-if="loadingLastMessages"
        class="flex items-center justify-center py-12"
      >
        <UIcon name="ph-circle-notch" class="w-6 h-6 text-accent animate-spin" />
      </div>

      <div
        v-else-if="sortedDates.length === 0"
        class="flex flex-col items-center justify-center py-12 text-text-secondary"
      >
        <UIcon name="ph-chat-teardrop-text" class="w-12 h-12 mb-3 opacity-40" />
        <p class="text-sm">No messages yet</p>
        <p class="text-xs mt-1">Send a message to start the conversation</p>
      </div>

      <template v-else>
        <div v-if="loadingOldMessages" class="flex justify-center py-2">
          <UIcon name="ph-circle-notch" class="w-5 h-5 text-text-secondary animate-spin" />
        </div>

        <div v-for="date in sortedDates" :key="date">
          <div class="flex justify-center my-4">
            <span class="text-[11px] font-medium text-text-secondary bg-surface px-3 py-1 rounded-full shadow-xs">
              {{ chatDateFormat(date) }}
            </span>
          </div>

          <div
            v-for="message in chatData[date]"
            :key="message.rId"
          >
            <div
              v-if="unreadBadgeCount > 0 && firstUnreadRId === message.rId"
              class="flex justify-center my-4"
            >
              <span class="text-[11px] font-medium text-white bg-danger px-3 py-1 rounded-full shadow-xs">
                {{ unreadBadgeCount }} unread message{{ unreadBadgeCount > 1 ? 's' : '' }}
              </span>
            </div>
            <div
              class="flex mb-3"
              :class="message.sender.id === $auth.currentUser?.id ? 'justify-end' : 'justify-start'"
            >
              <ChatMessageCard
              :message="message"
              :direction="message.sender.id === $auth.currentUser?.id ? 'outbound' : 'inbound'"
              @file-preview="openFilePreview"
              @file-download="downloadFile"
              @retry-send-message="retrySendMessage"
              @delete-message="openDeleteDialog"
              @reply-message="startReply"
              @scroll-to-message="scrollToMessage"
              :status="(pendingMessages[message.rId]?.status as 'sending' | 'sent' | 'failed') || message.status || 'sent'"
              :progress="pendingMessages[message.rId]?.progress || 0"
              :cancelTokenSource="pendingMessages[message.rId]?.cancelTokenSource || null"
            />
          </div>
          </div>
        </div>
      </template>

      <div
        v-show="showFilePreview"
        class="absolute inset-0 bg-black/70 z-10 flex flex-col rounded-2xl"
      >
        <div class="flex justify-end p-2">
          <button
            @click="showFilePreview = false"
            class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
          >
            <UIcon name="ph-x" class="w-5 h-5 text-white" />
          </button>
        </div>
        <div class="flex-1 flex items-center justify-center p-4">
          <img
            v-if="previewedFileExt && isImageFile(getFileExtension(previewedFileExt))"
            :src="previewedFile"
            alt="Preview"
            class="max-w-full max-h-full object-contain rounded-xl"
          />
          <video
            v-else-if="previewedFileExt && isVideoFile(getFileExtension(previewedFileExt))"
            :src="previewedFile"
            controls
            autoplay
            class="max-w-full max-h-full rounded-xl"
          >
            Your browser does not support the video tag.
          </video>
          <audio
            v-else-if="previewedFileExt && isAudioFile(getFileExtension(previewedFileExt))"
            :src="previewedFile"
            controls
            class="w-full max-w-sm"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      </div>
    </div>

    <div class="shrink-0 bg-white border-t-2 border-gray-200">
      <div v-if="filePreview" class="px-3 pt-3 pb-2 bg-gray-50 border-b border-border">
        <div class="flex items-center gap-2 bg-white p-2 rounded-xl shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <UIcon :name="getFileIcon(filePreview.type)" class="w-4 h-4 text-accent" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ filePreview.name }}</p>
            <p class="text-xs text-text-secondary">{{ formatFileSize(filePreview.size) }}</p>
          </div>
          <button @click="clearFilePreview" class="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer">
            <UIcon name="ph-x" class="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        <p v-if="filePreview.size > MAX_FILE_SIZE" class="text-xs text-danger mt-1">
          File size exceeds the limit. Max 2MB allowed.
        </p>
      </div>

      <div v-if="isRecording" class="flex items-center gap-2 px-4 py-3 bg-red-50">
        <span class="w-2 h-2 bg-danger rounded-full animate-pulse" />
        <span class="text-sm text-danger font-medium">Recording</span>
        <span class="text-sm text-danger">{{ recordingTime }}</span>
        <div class="flex-1" />
        <button @click="stopRecording" class="text-sm text-danger font-semibold hover:underline cursor-pointer">Stop</button>
      </div>

      <div v-if="replyingTo" class="flex items-stretch gap-2 px-4 py-2 bg-blue-50 border-t-2 border-blue-200">
        <div class="flex items-stretch gap-2 flex-1 min-w-0">
          <div class="w-1 shrink-0 bg-accent rounded-full" />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-accent truncate">Replying to {{ replyingTo.sender.name }}</p>
            <p class="text-xs text-text-secondary truncate">{{ replyingTo.content || (replyingTo.file ? 'File' : '') || 'Message' }}</p>
          </div>
        </div>
        <button @click="cancelReply" class="w-6 h-6 rounded-full hover:bg-blue-100 flex items-center justify-center shrink-0 cursor-pointer">
          <UIcon name="ph-x" class="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      <div class="flex items-stretch gap-2 px-4 py-4">
        <div class="relative flex">
          <button
            @click="showAttachMenu = !showAttachMenu"
            class="w-10 self-stretch rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <UIcon name="ph-paperclip" class="w-5 h-5 text-blue-500" />
          </button>
          <transition name="fade">
            <div
              v-if="showAttachMenu"
              class="absolute bottom-12 left-0 bg-surface rounded-xl shadow-xl border border-border p-2 w-44"
            >
              <button @click="triggerFileInput('document'); showAttachMenu = false" class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-text-primary transition-colors cursor-pointer">
                <UIcon name="ph-file-text" class="w-4 h-4 text-text-secondary" /> Documents
              </button>
              <button @click="startRecording(); showAttachMenu = false" :disabled="isRecording" class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-text-primary transition-colors cursor-pointer disabled:opacity-50">
                <UIcon name="ph-microphone" class="w-4 h-4 text-text-secondary" /> Voice
              </button>
              <button @click="triggerFileInput('audio'); showAttachMenu = false" class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-text-primary transition-colors cursor-pointer">
                <UIcon name="ph-music-note" class="w-4 h-4 text-text-secondary" /> Audio
              </button>
              <button @click="triggerFileInput('media'); showAttachMenu = false" class="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-text-primary transition-colors cursor-pointer">
                <UIcon name="ph-image" class="w-4 h-4 text-text-secondary" /> Photos
              </button>
            </div>
          </transition>
        </div>

        <input ref="fileInput" type="file" class="hidden" @change="handleFileSelect" />

        <textarea
          v-model="newMessage"
          placeholder="Type a message..."
          rows="1"
          class="flex-1 bg-blue-50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 resize-none border-2 border-blue-200 focus:border-blue-400 transition-colors max-h-[240px] overflow-y-auto"
          @keydown.enter="onEnterKey"
          @input="autoResize"
        />

        <button
          @click="isRecording ? stopRecording() : sendMessage()"
          :disabled="!newMessage.trim() && !filePreview && !isRecording"
          class="w-10 self-stretch rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-md"
        >
          <UIcon
            :name="isRecording ? 'ph-stop-fill' : 'ph-paper-plane-right-fill'"
            class="w-5 h-5 text-white"
          />
        </button>
      </div>
    </div>
    <teleport to="body">
      <div v-if="showDeleteDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click="showDeleteDialog = false">
        <div class="bg-white rounded-2xl p-6 w-80 shadow-2xl" @click.stop>
          <h3 class="text-lg font-semibold text-text-primary mb-4">Delete Message?</h3>
          <div class="flex flex-col gap-2 mb-4">
            <label class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="radio" v-model="deleteMode" value="me" class="accent-blue-600" />
              <span class="text-sm text-text-primary">Delete for me</span>
            </label>
            <label v-if="canDeleteForAll" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="radio" v-model="deleteMode" value="all" class="accent-blue-600" />
              <span class="text-sm text-text-primary">Delete for all</span>
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button
              @click="showDeleteDialog = false"
              class="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="confirmDelete"
              class="px-4 py-2 text-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { useAppToast } from '../composables/useAppToast'
import type { ChatData, ChatMessage, FilePreview, ChatUser } from '../types'

const { $axios, $auth, $ws } = useNuxtApp()
const toast = useAppToast()

const props = defineProps<{ conversationId: string }>()
const emit = defineEmits<{ (e: 'loaded'): void }>()
const showAttachMenu = ref(false)
const newMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const fileValue = ref<File | null>(null)
const filePreview = ref<FilePreview | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const showFilePreview = ref(false)
const previewedFile = ref('')
const previewedFileExt = ref<string | undefined>(undefined)
const isRecording = ref(false)
const recordingTime = ref('0:00')

const chatData = ref<ChatData>({})
const pendingMessages = ref<Record<string, { status: string; progress: number; cancelTokenSource: AbortController; file: File | null }>>({})
const loadingLastMessages = ref(false)
const loadingOldMessages = ref(false)
const hasMoreOldMessages = ref(false)
const chatCurrentPage = ref(1)
const scrollPositionBeforeLoad = ref(0)

const showDeleteDialog = ref(false)
const deleteTargetMessage = ref<ChatMessage | null>(null)
const deleteMode = ref<'me' | 'all'>('me')
const canDeleteForAll = computed(() => deleteTargetMessage.value?.sender.id === $auth.currentUser?.id)

const replyingTo = ref<ChatMessage | null>(null)
const unreadBadgeCount = ref(0)

const MAX_FILE_SIZE = 2 * 1024 * 1024

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordingInterval: ReturnType<typeof setInterval> | null = null
let recordingStartTime: number | null = null

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']

const sortedDates = computed(() => {
  if (!chatData.value) return []
  return Object.keys(chatData.value).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
})

const firstUnreadRId = computed(() => {
  for (const date of sortedDates.value) {
    for (const msg of chatData.value[date] || []) {
      if (msg.sender.id !== $auth.currentUser?.id && !msg.read_at) {
        return msg.rId
      }
    }
  }
  return null
})

const unreadMessageCount = computed(() => {
  let count = 0
  for (const date of sortedDates.value) {
    for (const msg of chatData.value[date] || []) {
      if (msg.sender.id !== $auth.currentUser?.id && !msg.read_at) {
        count++
      }
    }
  }
  return count
})

function sendReadAck() {
  if (!props.conversationId) return
  $ws.send({ type: 'messages-read', conversation_id: props.conversationId })
}

function markReadLocally() {
  const now = new Date().toISOString()
  for (const d of Object.keys(chatData.value)) {
    for (const m of chatData.value[d] || []) {
      if (m.sender.id !== $auth.currentUser?.id && !m.read_at) {
        m.read_at = now
      }
    }
  }
}

function handleIncomingMessage(data: any) {
  if (data.type === 'delivery-update' && data.message_id) {
    for (const d of Object.keys(chatData.value)) {
      const found = chatData.value[d]?.find((m: any) => m.rId === data.message_id)
      if (found) {
        found.delivered_at = new Date().toISOString()
        break
      }
    }
    return
  }
  if (data.type === 'read-update' && data.conversation_id) {
    if (data.conversation_id === props.conversationId) {
      const now = new Date().toISOString()
      for (const d of Object.keys(chatData.value)) {
        for (const m of chatData.value[d] || []) {
          if (m.sender.id === $auth.currentUser?.id && !m.read_at) {
            m.read_at = now
          }
        }
      }
    }
    return
  }
  if (data.type === 'message-deleted' && data.message_id) {
    removeMessageFromChatData(data.message_id)
    return
  }
  if (data.type === 'new-message' && data.message) {
    const msg = data.message

    if (pendingMessages.value[msg.rId]) {
      delete pendingMessages.value[msg.rId]
      for (const d of Object.keys(chatData.value)) {
        const found = chatData.value[d]?.find((m: any) => m.rId === msg.rId)
        if (found) {
          found.status = 'sent'
          found.reply_to = msg.reply_to
          found.content = msg.content
          found.file = msg.file
          found.file_extension = msg.file_extension
          found.file_size = msg.file_size
          found.created_at = msg.created_at
          found.created_at_time = msg.created_at_time
          break
        }
      }
      return
    }

    if (data.conversation_id !== props.conversationId) return

    const date = msg.created_at.includes('T')
      ? msg.created_at.split('T')[0]
      : msg.created_at.split(' ')[0]
    if (!chatData.value[date]) chatData.value[date] = []
    const exists = chatData.value[date].some((m: any) => m.rId === msg.rId)
    if (!exists) {
      chatData.value[date]!.push(msg)
      if (msg.sender?.id !== $auth.currentUser?.id) {
        unreadBadgeCount.value = 0
        markReadLocally()
        nextTick(() => sendReadAck())
      }
      nextTick(() => scrollToBottom())
    }
  }
}

const getFileExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() || ''

const isImageFile = (ext: string | undefined) => ext ? IMAGE_EXTENSIONS.includes(ext.toLowerCase()) : false
const isVideoFile = (ext: string | undefined) => ext ? VIDEO_EXTENSIONS.includes(ext.toLowerCase()) : false
const isAudioFile = (ext: string | undefined) => ext ? AUDIO_EXTENSIONS.includes(ext.toLowerCase()) : false

const getFileIcon = (ext: string | undefined) => {
  const map: Record<string, string> = {
    pdf: 'ph-file-pdf', doc: 'ph-file-text', docx: 'ph-file-text',
    xls: 'ph-file-spreadsheet', xlsx: 'ph-file-spreadsheet',
    ppt: 'ph-file-presentation', pptx: 'ph-file-presentation',
    jpg: 'ph-image', webp: 'ph-image', jpeg: 'ph-image', png: 'ph-image',
    gif: 'ph-image', svg: 'ph-image', bmp: 'ph-image',
    mp3: 'ph-music-note', wav: 'ph-music-note', ogg: 'ph-music-note',
    m4a: 'ph-music-note', aac: 'ph-music-note', flac: 'ph-music-note',
    mp4: 'ph-video', avi: 'ph-video', mov: 'ph-video',
    wmv: 'ph-video', webm: 'ph-video', mkv: 'ph-video',
    zip: 'ph-archive', rar: 'ph-archive',
  }
  return (ext && map[ext.toLowerCase()]) || 'ph-file'
}

const getFileName = (fp: string) => fp.split('/').pop() || 'file'

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const s = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${s[i]}`
}

const chatDateFormat = (date: string) => {
  const d = new Date(date)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 240) + 'px'
}

function onEnterKey(e: KeyboardEvent) {
  if (e.shiftKey) return
  e.preventDefault()
  sendMessage()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function openDeleteDialog(message: ChatMessage) {
  deleteTargetMessage.value = message
  deleteMode.value = message.sender.id === $auth.currentUser?.id ? 'all' : 'me'
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTargetMessage.value) return
  const msg = deleteTargetMessage.value
  try {
    await $axios.post('/messages/delete', {
      message_id: msg.rId,
      mode: deleteMode.value,
    })
    for (const date of Object.keys(chatData.value)) {
      const arr = chatData.value[date]
      if (arr) {
        const idx = arr.findIndex((m) => m.rId === msg.rId)
        if (idx !== -1) {
          arr.splice(idx, 1)
          if (arr.length === 0) delete chatData.value[date]
          break
        }
      }
    }
    showDeleteDialog.value = false
    deleteTargetMessage.value = null
  } catch {
    toast.error({ title: 'Failed to delete message' })
  }
}

function removeMessageFromChatData(messageId: string) {
  for (const date of Object.keys(chatData.value)) {
    const arr = chatData.value[date]
    if (arr) {
      const idx = arr.findIndex((m) => m.rId === messageId)
      if (idx !== -1) {
        arr.splice(idx, 1)
        if (arr.length === 0) delete chatData.value[date]
        break
      }
    }
  }
}

function startReply(message: ChatMessage) {
  replyingTo.value = message
  clearFilePreview()
  ;(document.querySelector('textarea') as HTMLTextAreaElement)?.focus()
}

function cancelReply() {
  replyingTo.value = null
}

function scrollToMessage(rId: string) {
  const el = document.querySelector(`[data-r-id="${rId}"]`)
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

function triggerFileInput(type: 'document' | 'media' | 'audio') {
  if (!fileInput.value) return
  const accept = { media: 'image/*,video/*', audio: 'audio/*', document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar' }
  fileInput.value.accept = accept[type]
  fileInput.value.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    fileValue.value = file
    filePreview.value = { file, name: file.name, type: getFileExtension(file.name), size: file.size }
  }
}

function clearFilePreview() {
  filePreview.value = null
  fileValue.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function openFilePreview(url: string, ext: string | undefined) {
  previewedFile.value = url
  previewedFileExt.value = ext
  showFilePreview.value = true
}

function downloadFile(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/wav' })
      const file = new File([blob], `recording-${Date.now()}.wav`, { type: 'audio/wav' })
      fileValue.value = file
      filePreview.value = { file, name: `Voice Message ${new Date().toLocaleTimeString()}`, type: 'wav', size: blob.size }
      stream.getTracks().forEach((t) => t.stop())
    }
    mediaRecorder.start()
    isRecording.value = true
    recordingStartTime = Date.now()
    recordingInterval = setInterval(() => {
      const e = Math.floor((Date.now() - (recordingStartTime || 0)) / 1000)
      recordingTime.value = `${Math.floor(e / 60)}:${(e % 60).toString().padStart(2, '0')}`
    }, 1000)
  } catch {
    toast.error({ title: 'Microphone access denied', description: 'Allow microphone permission to record voice messages.' })
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop()
  isRecording.value = false
  if (recordingInterval) { clearInterval(recordingInterval); recordingInterval = null }
}

async function getUserChatMessages() {
  if (Object.keys(chatData.value).length && !hasMoreOldMessages.value) return
  try {
    if (hasMoreOldMessages.value) loadingOldMessages.value = true
    else loadingLastMessages.value = true

    const { data } = await $axios.get('/messages', {
      params: { conversation_id: props.conversationId, page: chatCurrentPage.value },
    })

    if (Object.keys(chatData.value).length > 0) {
      for (const [date, msgs] of Object.entries(data.data)) {
        chatData.value[date] = chatData.value[date]
          ? [...(msgs as any[]), ...chatData.value[date]]
          : (msgs as any[])
      }
    } else {
      chatData.value = data.data
    }

    // Mark own messages as sent
    for (const date of Object.keys(chatData.value)) {
      for (const msg of chatData.value[date]!) {
        if (pendingMessages.value[msg.rId]) {
          delete pendingMessages.value[msg.rId]
          msg.status = 'sent'
        }
      }
    }

    hasMoreOldMessages.value = chatCurrentPage.value < data.last_page
    if (hasMoreOldMessages.value) chatCurrentPage.value++
  } catch (error) {
    toast.error({ title: 'Failed to load messages' })
  } finally {
    loadingOldMessages.value = false
    loadingLastMessages.value = false
  }
}

async function sendMessage() {
  const content = newMessage.value.trim()
  if (!content && !fileValue.value) return
  if (fileValue.value instanceof File && fileValue.value.size > MAX_FILE_SIZE) {
    toast.error({ title: 'File size exceeds the limit' })
    return
  }

  if (unreadBadgeCount.value > 0) {
    unreadBadgeCount.value = 0
    markReadLocally()
    sendReadAck()
  }

  const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const today = now.toISOString().split('T')[0] as string
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)

  const optimistic: ChatMessage = {
    rId: tempId,
    id: Date.now(),
    sender: {
      id: $auth.currentUser?.id || '',
      name: $auth.currentUser?.username || 'You',
      image: $auth.currentUser?.avatar || '',
    },
    direction: 'outbound',
    content,
    file: filePreview.value ? URL.createObjectURL(filePreview.value.file) : '',
    file_extension: filePreview.value ? filePreview.value.type : '',
    file_size: filePreview.value ? filePreview.value.size : undefined,
    reply_to: replyingTo.value ? {
      rId: replyingTo.value.rId,
      sender: { id: replyingTo.value.sender.id, name: replyingTo.value.sender.name },
      content: replyingTo.value.content,
    } : undefined,
    delivered_at: null,
    read_at: null,
    created_at: now.toISOString(),
    created_at_time: timeStr,
    status: 'sending',
  }

  if (!chatData.value[today]) chatData.value[today] = []
  chatData.value[today].push(optimistic)

  const controller = new AbortController()
  pendingMessages.value[tempId] = { status: 'sending', progress: 0, cancelTokenSource: controller, file: fileValue.value }

  newMessage.value = ''
  scrollToBottom()

  try {
    const formData = new FormData()
    formData.append('conversation_id', props.conversationId)
    formData.append('content', content)
    formData.append('rId', tempId)
    if (replyingTo.value) {
      formData.append('reply_to_rId', replyingTo.value.rId)
      cancelReply()
    }
    if (fileValue.value instanceof File) {
      formData.append('file', fileValue.value)
      formData.append('file_extension', filePreview.value?.type || '')
      formData.append('file_size', String(fileValue.value.size))
    }

    clearFilePreview()

    const { status } = await $axios.post('/messages', formData, {
      signal: controller.signal,
      onUploadProgress: ({ progress, loaded, total }: any) => {
        if (progress && pendingMessages.value[tempId]) pendingMessages.value[tempId]!.progress = Math.round(progress * 100)
        else if (total && pendingMessages.value[tempId]) pendingMessages.value[tempId]!.progress = Math.round((loaded / total) * 100)
      },
    })

    if (status === 201) {
      delete pendingMessages.value[tempId]
      optimistic.status = 'sent'
    }
  } catch (err: any) {
    if (err.name !== 'CanceledError') {
      pendingMessages.value[tempId].status = 'failed'
      optimistic.status = 'failed'
      toast.error({ title: 'Failed to send message', description: err?.response?.data?.message })
    }
  }
}

async function retrySendMessage(message: ChatMessage) {
  const pending = pendingMessages.value[message.rId]
  if (!pending) return

  pending.status = 'sending'
  pending.progress = 0

  try {
    const formData = new FormData()
    formData.append('conversation_id', props.conversationId)
    formData.append('content', message.content)
    formData.append('rId', message.rId)
    if (message.reply_to?.rId) {
      formData.append('reply_to_rId', message.reply_to.rId)
    }
    if (pending.file instanceof File) {
      formData.append('file', pending.file)
      formData.append('file_extension', message.file_extension || '')
      formData.append('file_size', String(pending.file.size))
    }

    pending.cancelTokenSource = new AbortController()
    const { status } = await $axios.post('/messages', formData, {
      signal: pending.cancelTokenSource.signal,
      onUploadProgress: ({ progress, loaded, total }) => {
        if (progress) pending.progress = Math.round(progress * 100)
        else if (total) pending.progress = Math.round((loaded / total) * 100)
      },
    })

    if (status === 201) {
      delete pendingMessages.value[message.rId]
      message.status = 'sent'
    }
  } catch (err: any) {
    pending.status = 'failed'
    toast.error({ title: 'Failed to send message', description: err?.response?.data?.message })
  }
}

const handleMessageContainerScroll = async () => {
  if (messagesContainer.value?.scrollTop === 0) {
    scrollPositionBeforeLoad.value = messagesContainer.value.scrollHeight - messagesContainer.value.scrollTop
    await getUserChatMessages()
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight - scrollPositionBeforeLoad.value
    }
  }
}

$ws.onMessage(handleIncomingMessage)

watch(messagesContainer, () => {
  if (messagesContainer.value) {
    messagesContainer.value.addEventListener('scroll', handleMessageContainerScroll)
  }
})

onUnmounted(() => {
  $ws.offMessage(handleIncomingMessage)
  if (props.conversationId) {
    $ws.leaveConversation(props.conversationId)
  }
})

watch(() => props.conversationId, async (newId, oldId) => {
  if (oldId) $ws.leaveConversation(oldId)
  chatData.value = {}
  chatCurrentPage.value = 1
  hasMoreOldMessages.value = false
  $ws.joinConversation(newId)
  await getUserChatMessages()
  await nextTick()
  scrollToBottom()
  sendReadAck()
  unreadBadgeCount.value = unreadMessageCount.value
  emit('loaded')
}, { immediate: true })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
