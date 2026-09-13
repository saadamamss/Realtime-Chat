import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const TEST_DB_PATH = path.resolve(process.cwd(), 'tests', '__mocks__', 'test.db')

let db: Database.Database

function initTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
  db = new Database(TEST_DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      avatar TEXT,
      password_hash TEXT,
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
      reply_to_rId TEXT,
      delivered_at TEXT,
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
  `)

  return db
}

function seedUser(username: string, phone: string): string {
  const id = crypto.randomUUID()
  const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${username}`
  db.prepare('INSERT INTO users (id, username, phone_number, avatar) VALUES (?, ?, ?, ?)').run(id, username, phone, avatar)
  return id
}

function createConv(user1: string, user2: string): string {
  const id = crypto.randomUUID()
  const name = `dm:${[user1, user2].sort().join(':')}`
  db.prepare('INSERT INTO conversations (id, name, created_by) VALUES (?, ?, ?)').run(id, name, user1)
  db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(id, user1)
  db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(id, user2)
  return id
}

function createMsg(senderId: string, convId: string, content: string, rId?: string): string {
  const id = rId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  db.prepare('INSERT INTO messages (rId, sender_id, conversation_id, content) VALUES (?, ?, ?, ?)').run(id, senderId, convId, content)
  return id
}

beforeAll(() => {
  initTestDb()
})

afterAll(() => {
  db.close()
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
})

describe('database operations', () => {
  let aliceId: string
  let bobId: string
  let convId: string

  it('creates users', () => {
    aliceId = seedUser('Alice', '+1-555-0101')
    bobId = seedUser('Bob', '+1-555-0102')
    expect(aliceId).toBeTruthy()
    expect(bobId).toBeTruthy()
    expect(aliceId).not.toBe(bobId)
  })

  it('finds user by phone', () => {
    const user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get('+1-555-0101') as any
    expect(user).toBeTruthy()
    expect(user.username).toBe('Alice')
  })

  it('creates conversation', () => {
    convId = createConv(aliceId, bobId)
    expect(convId).toBeTruthy()

    const participants = db.prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ?').all(convId) as any[]
    expect(participants).toHaveLength(2)
  })

  it('creates messages', () => {
    const msg1 = createMsg(aliceId, convId, 'Hello Bob!')
    const msg2 = createMsg(bobId, convId, 'Hi Alice!')
    expect(msg1).toBeTruthy()
    expect(msg2).toBeTruthy()

    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ?').all(convId) as any[]
    expect(messages).toHaveLength(2)
  })

  it('deletes message for me', () => {
    const msgId = createMsg(aliceId, convId, 'delete me')
    const convId2 = db.prepare('SELECT conversation_id FROM messages WHERE rId = ?').get(msgId) as any

    db.prepare('INSERT INTO message_deletions (message_rId, user_id) VALUES (?, ?)').run(msgId, aliceId)

    const deletion = db.prepare('SELECT * FROM message_deletions WHERE message_rId = ? AND user_id = ?').get(msgId, aliceId)
    expect(deletion).toBeTruthy()
  })

  it('deletes message for all', () => {
    const msgId = createMsg(aliceId, convId, 'delete for all')
    db.prepare('DELETE FROM messages WHERE rId = ?').run(msgId)
    const msg = db.prepare('SELECT * FROM messages WHERE rId = ?').get(msgId)
    expect(msg).toBeUndefined()
  })

  it('marks messages as read', () => {
    const msgId = createMsg(aliceId, convId, 'read me')
    const result = db.prepare('UPDATE messages SET read_at = datetime(\'now\') WHERE rId = ? AND read_at IS NULL').run(msgId)
    expect(result.changes).toBe(1)

    const msg = db.prepare('SELECT read_at FROM messages WHERE rId = ?').get(msgId) as any
    expect(msg.read_at).toBeTruthy()
  })

  it('marks messages as delivered', () => {
    const msgId = createMsg(aliceId, convId, 'deliver me')
    db.prepare("UPDATE messages SET delivered_at = datetime('now') WHERE rId = ? AND delivered_at IS NULL").run(msgId)

    const msg = db.prepare('SELECT delivered_at FROM messages WHERE rId = ?').get(msgId) as any
    expect(msg.delivered_at).toBeTruthy()
  })

  it('gets conversations for user', () => {
    const convs = db.prepare(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ? AND cp.hidden = 0
    `).all(aliceId) as any[]
    expect(convs.length).toBeGreaterThanOrEqual(1)
  })

  it('manages contacts', () => {
    db.prepare('INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?)').run(aliceId, bobId)
    const contacts = db.prepare(`
      SELECT u.username FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.user_id = ?
    `).all(aliceId) as any[]
    expect(contacts).toHaveLength(1)
    expect(contacts[0].username).toBe('Bob')
  })

  it('wipes conversation for user', () => {
    db.prepare("UPDATE conversation_participants SET deleted_at = datetime('now') WHERE conversation_id = ? AND user_id = ?").run(convId, aliceId)
    const cp = db.prepare('SELECT deleted_at FROM conversation_participants WHERE conversation_id = ? AND user_id = ?').get(convId, aliceId) as any
    expect(cp.deleted_at).toBeTruthy()
  })
})
