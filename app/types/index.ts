declare global {
  interface Window {
    currentAudioPlayer?: HTMLAudioElement
  }
}

export interface ChatUser {
  id: string
  name: string
  phone_number?: string
  image: string
  avatar?: string
  username?: string
}

export interface FilePreview {
  file: File
  name: string
  type: string
  size: number
}

export interface ReplyTo {
  rId: string
  sender: { id: string; name: string }
  content: string
}

export interface ChatMessage {
  rId: string
  id: number
  sender: ChatUser
  direction: 'inbound' | 'outbound'
  content: string
  file?: string
  file_extension?: string
  file_size?: number
  reply_to?: ReplyTo
  duration?: number
  delivered_at?: string | null
  read_at: string | null
  created_at: string
  created_at_time: string
  progress?: number
  status?: 'sending' | 'sent' | 'failed'
}

export interface ChatData {
  [date: string]: ChatMessage[]
}

export interface PendingMessage {
  id: string
  content: string
  type: 'text' | 'file'
  file?: File
  filePreview?: FilePreview | null
  timestamp: Date
  direction: 'outbound'
  status: 'sending' | 'sent' | 'failed'
  progress?: number
  requestId?: string
}

export interface MessageStatus {
  requestId: string
  status: 'sending' | 'sent' | 'failed'
  progress?: number
  error?: string
}

export interface SocketMessage {
  type: 'new-message' | 'joined' | 'user-joined' | 'user-left'
  conversation_id?: string
  message?: ChatMessage
  user?: ChatUser
}
