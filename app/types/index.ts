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
  file?: string
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
  conversation_id?: string
}

export interface ChatData {
  [date: string]: ChatMessage[]
}

export interface PendingUpload {
  status: string
  progress: number
  cancelTokenSource: AbortController
  file: File | null
}

export interface SocketMessage {
  type: 'new-message' | 'delivery-update' | 'read-update' | 'message-deleted' | 'typing'
  conversation_id?: string
  message?: ChatMessage
  message_id?: string
  user_id?: string
}

export interface WsTypingEvent {
  type: 'typing'
  conversation_id: string
  user_id: string
}
