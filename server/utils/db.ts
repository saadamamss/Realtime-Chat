import Database from 'better-sqlite3'
import path from 'path'
import type {
  DbUser, DbConversation, DbMessage, DbContact, DbParticipant,
  DbPragamaColumn, DbSqliteTable, DbMessageWithSender, DbReplyRow,
  DbConversationRow, FormattedSender, FormattedReplyTo, FormattedMessage,
  FormattedConversation, ContactUser, BasicUser,
} from '../types/db'

const dbPath = path.resolve(process.cwd(), 'data', 'chat.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, contact_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (contact_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      hidden INTEGER DEFAULT 0,
      deleted_at TEXT,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rId TEXT UNIQUE NOT NULL,
      sender_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      file_url TEXT DEFAULT '',
      file_extension TEXT DEFAULT '',
      file_size INTEGER,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS message_deletions (
      message_rId TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (message_rId, user_id),
      FOREIGN KEY (message_rId) REFERENCES messages(rId),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_rId ON messages(rId);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
    CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
  `)

  migrateV1()
  migrateV2()
  migrateV3()
  migrateV4()
  migrateV5()
  migrateV6()
  migrateV7()
  migrateV8()
  seedUsers()
}

function migrateV1() {
  const cols = db.prepare("PRAGMA table_info('users')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'phone_number')) {
    db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE")
  }
}

function migrateV2() {
  const cols = db.prepare("PRAGMA table_info('conversations')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'created_by')) {
    db.exec("ALTER TABLE conversations ADD COLUMN created_by TEXT")
  }
}

function migrateV3() {
  const cols = db.prepare("PRAGMA table_info('conversation_participants')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'hidden')) {
    db.exec("ALTER TABLE conversation_participants ADD COLUMN hidden INTEGER DEFAULT 0")
  }
}

function migrateV4() {
  const cols = db.prepare("PRAGMA table_info('conversation_participants')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'deleted_at')) {
    db.exec("ALTER TABLE conversation_participants ADD COLUMN deleted_at TEXT")
  }
}

function migrateV5() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='message_deletions'").all() as DbSqliteTable[]
  if (tables.length === 0) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS message_deletions (
        message_rId TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (message_rId, user_id),
        FOREIGN KEY (message_rId) REFERENCES messages(rId),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
  }
}

function migrateV6() {
  const cols = db.prepare("PRAGMA table_info('messages')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'reply_to_rId')) {
    db.exec("ALTER TABLE messages ADD COLUMN reply_to_rId TEXT")
  }
}

function migrateV7() {
  const cols = db.prepare("PRAGMA table_info('messages')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'delivered_at')) {
    db.exec("ALTER TABLE messages ADD COLUMN delivered_at TEXT")
  }
}

function migrateV8() {
  const cols = db.prepare("PRAGMA table_info('users')").all() as DbPragamaColumn[]
  if (!cols.some(c => c.name === 'password_hash')) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT")
  }
}

function seedUsers() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  if (count > 0) return

  const demo = [
    { username: 'Alice', phone: '+1-555-0101', color: '2563eb' },
    { username: 'Bob', phone: '+1-555-0102', color: '7c3aed' },
    { username: 'Charlie', phone: '+1-555-0103', color: '059669' },
  ]

  const insert = db.prepare('INSERT INTO users (id, username, phone_number, avatar) VALUES (?, ?, ?, ?)')
  for (const u of demo) {
    const id = crypto.randomUUID()
    const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.username)}&backgroundColor=${u.color}&textColor=ffffff`
    insert.run(id, u.username, u.phone, avatar)
  }
}

export function findOrCreateUser(username: string, phoneNumber: string): DbUser {
  const db = getDb()
  let user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber) as DbUser | undefined
  if (user) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as DbUser
  } else {
    const id = crypto.randomUUID()
    const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`
    db.prepare('INSERT INTO users (id, username, phone_number, avatar) VALUES (?, ?, ?, ?)').run(id, username, phoneNumber, avatar)
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser
  }
  return user!
}

export function addContact(userId: string, phoneNumber: string): ContactUser | null {
  const db = getDb()
  const contact = db.prepare('SELECT id FROM users WHERE phone_number = ?').get(phoneNumber) as { id: string } | undefined
  if (!contact) return null
  if (contact.id === userId) return null
  db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(userId, contact.id)
  return db.prepare('SELECT id, username as name, phone_number, avatar as image FROM users WHERE id = ?').get(contact.id) as ContactUser
}

export function removeContact(userId: string, contactId: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM contacts WHERE user_id = ? AND contact_id = ?').run(userId, contactId)
  return result.changes > 0
}

export function getContacts(userId: string): ContactUser[] {
  const db = getDb()
  return db.prepare(`
    SELECT u.id, u.username as name, u.phone_number, u.avatar as image
    FROM contacts c
    JOIN users u ON u.id = c.contact_id
    WHERE c.user_id = ?
    ORDER BY u.username
  `).all(userId) as ContactUser[]
}

export function getOrCreateDMConversation(user1Id: string, user2Id: string, createdBy?: string): DbConversation {
  const db = getDb()
  const ids = [user1Id, user2Id].sort()
  const name = `dm:${ids[0]}:${ids[1]}`

  let conv = db.prepare('SELECT * FROM conversations WHERE name = ?').get(name) as DbConversation | undefined
  if (!conv) {
    const id = crypto.randomUUID()
    db.prepare('INSERT INTO conversations (id, name, created_by) VALUES (?, ?, ?)').run(id, name, createdBy || user1Id)
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as DbConversation
    addParticipant(id, user1Id)
    addParticipant(id, user2Id)
  } else {
    addParticipant(conv.id, user1Id)
  }
  return conv!
}

export function addParticipant(conversationId: string, userId: string): void {
  const db = getDb()
  try {
    const existing = db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId)
    if (existing) {
      db.prepare('UPDATE conversation_participants SET hidden = 0 WHERE conversation_id = ? AND user_id = ?').run(conversationId, userId)
    } else {
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conversationId, userId)
    }
  } catch {
    db.prepare('INSERT OR IGNORE INTO users (id, username, avatar) VALUES (?, ?, ?)').run(userId, `user_${userId.slice(0, 6)}`, `https://api.dicebear.com/9.x/initials/svg?seed=${userId}&backgroundColor=2563eb&textColor=ffffff`)
    db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conversationId, userId)
  }
}

export function createMessage(senderId: string, conversationId: string, content: string, file?: { url: string; ext: string; size: number }, customRId?: string, replyToRId?: string): FormattedMessage {
  const db = getDb()
  const rId = customRId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  db.prepare(`
    INSERT INTO messages (rId, sender_id, conversation_id, content, file_url, file_extension, file_size, reply_to_rId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(rId, senderId, conversationId, content, file?.url || '', file?.ext || '', file?.size || null, replyToRId || null)
  const row = db.prepare('SELECT * FROM messages WHERE rId = ?').get(rId) as DbMessage
  return formatMessage(row)
}

export function getMessages(conversationId: string, userId: string, page: number = 1, perPage: number = 15): { data: Record<string, FormattedMessage[]>; last_page: number; total: number } {
  const db = getDb()
  const offset = (page - 1) * perPage
  const rows = db.prepare(`
    SELECT m.*, u.username as sender_name, u.avatar as sender_avatar,
      COUNT(*) OVER() as total_count
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    LEFT JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
    LEFT JOIN message_deletions md ON md.message_rId = m.rId AND md.user_id = ?
    WHERE m.conversation_id = ?
      AND (cp.deleted_at IS NULL OR m.created_at > cp.deleted_at)
      AND md.user_id IS NULL
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, userId, conversationId, perPage, offset) as DbMessageWithSender[]

  const total = rows.length > 0 ? Number(rows[0]!.total_count ?? 0) : 0
  const lastPage = Math.ceil(total / perPage)
  for (const row of rows) delete row.total_count

  const replyRIds = rows.filter(r => r.reply_to_rId).map(r => r.reply_to_rId!).filter(Boolean)
  const replyMap: Record<string, { sender: { id: string; name: string }; content: string }> = {}
  if (replyRIds.length > 0) {
    const placeholders = replyRIds.map(() => '?').join(',')
    const replies = db.prepare(`
      SELECT m.rId, m.content, m.sender_id, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.rId IN (${placeholders})
    `).all(...replyRIds) as DbReplyRow[]
    for (const r of replies) {
      replyMap[r.rId] = { sender: { id: r.sender_id, name: r.sender_name }, content: r.content }
    }
  }

  const grouped: Record<string, FormattedMessage[]> = {}
  for (const row of rows.reverse()) {
    const date = (row.created_at.includes('T') ? row.created_at.split('T')[0] : row.created_at.split(' ')[0]) as string
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(formatMessage(row, replyMap))
  }

  return { data: grouped, last_page: lastPage, total }
}

export function getAllUsers(): BasicUser[] {
  const db = getDb()
  return db.prepare('SELECT id, username as name, phone_number, avatar as image FROM users ORDER BY username').all() as BasicUser[]
}

export function isParticipant(conversationId: string, userId: string): boolean {
  const db = getDb()
  return !!(db.prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId))
}

export function wipeConversation(conversationId: string, userId: string): void {
  const db = getDb()
  db.prepare("UPDATE conversation_participants SET deleted_at = datetime('now') WHERE conversation_id = ? AND user_id = ?").run(conversationId, userId)
}

export function deleteMessage(messageId: string, userId: string, mode: 'me' | 'all'): string | null {
  const db = getDb()
  if (mode === 'all') {
    const msg = db.prepare('SELECT conversation_id, sender_id FROM messages WHERE rId = ?').get(messageId) as { conversation_id: string; sender_id: string } | undefined
    if (!msg || msg.sender_id !== userId) return null
    db.prepare('DELETE FROM messages WHERE rId = ?').run(messageId)
    return msg.conversation_id
  } else {
    const msg = db.prepare('SELECT conversation_id FROM messages WHERE rId = ?').get(messageId) as { conversation_id: string } | undefined
    if (!msg) return null
    db.prepare('INSERT OR IGNORE INTO message_deletions (message_rId, user_id) VALUES (?, ?)').run(messageId, userId)
    return msg.conversation_id
  }
}

export function markDelivered(messageId: string): void {
  const db = getDb()
  db.prepare("UPDATE messages SET delivered_at = datetime('now') WHERE rId = ? AND delivered_at IS NULL").run(messageId)
}

export function markRead(conversationId: string, userId: string): number {
  const db = getDb()
  const result = db.prepare(`
    UPDATE messages SET read_at = datetime('now')
    WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL
  `).run(conversationId, userId)
  return result.changes
}

export function deleteConversation(conversationId: string, userId: string): void {
  const db = getDb()
  db.prepare('UPDATE conversation_participants SET hidden = 1, deleted_at = datetime(\'now\') WHERE conversation_id = ? AND user_id = ?').run(conversationId, userId)
}

export function getConversationParticipantIds(conversationId: string): string[] {
  const db = getDb()
  return (db.prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND hidden = 0').all(conversationId) as { user_id: string }[]).map(r => r.user_id)
}

export function getConversations(userId: string): FormattedConversation[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT c.id, c.name, c.created_at,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read_at IS NULL) as unread_count,
      (SELECT json_object(
        'id', u.id,
        'name', u.username,
        'phone_number', u.phone_number,
        'image', u.avatar
      )
      FROM conversation_participants cp2
      JOIN users u ON u.id = cp2.user_id
      WHERE cp2.conversation_id = c.id AND cp2.user_id != ?
      LIMIT 1
      ) as other_participant_json
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = ? AND cp.hidden = 0
      AND (EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id LIMIT 1) OR c.created_by = ?)
    ORDER BY last_message_at DESC
  `).all(userId, userId, userId, userId) as DbConversationRow[]

  return rows.map(row => {
    let other: FormattedConversation['other_participant'] = null
    if (row.other_participant_json) {
      try { other = JSON.parse(row.other_participant_json) } catch { other = null }
    }
    return { ...row, other_participant: other }
  })
}

function formatMessage(row: DbMessage | DbMessageWithSender, replyMap?: Record<string, { sender: { id: string; name: string }; content: string }>): FormattedMessage {
  const replyToRId = row.reply_to_rId
  const replyTo = replyToRId && replyMap?.[replyToRId] ? { rId: replyToRId, ...replyMap[replyToRId] } : undefined
  const senderName = 'sender_name' in row ? row.sender_name : ''
  const senderAvatar = 'sender_avatar' in row ? row.sender_avatar : ''
  return {
    rId: row.rId,
    id: row.id,
    sender: {
      id: row.sender_id,
      name: senderName,
      image: senderAvatar,
    },
    content: row.content,
    file: row.file_url ? `/api/files${row.file_url}` : '',
    file_extension: row.file_extension || '',
    file_size: row.file_size || undefined,
    reply_to: replyTo,
    delivered_at: row.delivered_at || null,
    read_at: row.read_at,
    created_at: row.created_at,
    created_at_time: new Date(row.created_at).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
  }
}

export function findUserByPhoneNumber(phoneNumber: string): DbUser | null {
  const db = getDb()
  return db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber) as DbUser || null
}

export function createUser(username: string, phoneNumber: string, passwordHash: string): BasicUser {
  const db = getDb()
  const id = crypto.randomUUID()
  const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`
  db.prepare('INSERT INTO users (id, username, phone_number, avatar, password_hash) VALUES (?, ?, ?, ?, ?)').run(id, username, phoneNumber, avatar, passwordHash)
  return db.prepare('SELECT id, username, phone_number, avatar FROM users WHERE id = ?').get(id) as BasicUser
}

export function findUserById(id: string): DbUser | null {
  const db = getDb()
  return db.prepare('SELECT id, username, phone_number, avatar FROM users WHERE id = ?').get(id) as DbUser || null
}

export function getFileConversationId(filename: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT conversation_id FROM messages WHERE file_url LIKE ?').get(`%${filename}`) as { conversation_id: string } | undefined
  return row?.conversation_id || null
}
