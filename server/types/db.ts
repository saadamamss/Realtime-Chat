export interface DbUser {
  id: string
  username: string
  phone_number: string | null
  avatar: string | null
  password_hash: string | null
  created_at: string
}

export interface DbConversation {
  id: string
  name: string | null
  created_by: string | null
  created_at: string
}

export interface DbMessage {
  rId: string
  id: number
  conversation_id: string
  sender_id: string
  content: string
  file_url: string
  file_extension: string
  file_size: number | null
  reply_to_rId: string | null
  delivered_at: string | null
  read_at: string | null
  created_at: string
}

export interface DbContact {
  user_id: string
  contact_id: string
  created_at: string
}

export interface DbParticipant {
  conversation_id: string
  user_id: string
  hidden: number
  deleted_at: string | null
}

export interface DbMessageDeletion {
  message_rId: string
  user_id: string
  created_at: string
}

export interface DbPragamaColumn {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

export interface DbSqliteTable {
  name: string
  type: string
  tbl_name: string
  rootpage: number
  sql: string
}

export interface FormattedSender {
  id: string
  name: string
  image: string
}

export interface FormattedReplyTo {
  rId: string
  sender: { id: string; name: string }
  content: string
  file?: string
}

export interface FormattedMessage {
  rId: string
  id: number
  sender: FormattedSender
  content: string
  file: string
  file_extension: string
  file_size: number | undefined
  reply_to: FormattedReplyTo | undefined
  delivered_at: string | null
  read_at: string | null
  created_at: string
  created_at_time: string
  status: 'sent'
}

export interface DbMessageWithSender extends DbMessage {
  sender_name: string
  sender_avatar: string
  total_count?: number
}

export interface DbReplyRow {
  rId: string
  content: string
  sender_id: string
  sender_name: string
}

export interface DbConversationRow {
  id: string
  name: string | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  other_participant_json: string | null
}

export interface FormattedConversation {
  id: string
  name: string | null
  created_at: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  other_participant: {
    id: string
    name: string
    phone_number: string
    image: string
  } | null
}

export interface ContactUser {
  id: string
  name: string
  phone_number: string
  image: string
}

export interface BasicUser {
  id: string
  name: string
  phone_number: string
  image: string
}
