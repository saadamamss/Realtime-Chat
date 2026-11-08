// DB facade: lets the app run data operations against SQLite (default)
// or Firestore, switched by the DB_MODE environment variable.
//
//   DB_MODE=sqlite     → server/utils/db (better-sqlite3, original behavior)
//   DB_MODE=firestore  → server/utils/db-firestore (migrated Firebase data)
//
// Every facade function is async so call sites are identical under both
// backends. Firestore modules are lazily imported so SQLite mode never
// initializes Firebase (which would crash without credentials).

export type DbMode = 'sqlite' | 'firestore'

const DB_MODE: DbMode =
  (process.env.DB_MODE as DbMode) || 'sqlite'

export const isFirestore = DB_MODE === 'firestore'

// SQLite module: statically imported (safe — it does not open the DB at import time)
import * as sqlite from './db'

// Firestore module: lazily imported only when needed
let firestorePromise: Promise<typeof import('./db-firestore')> | null = null
function firestore() {
  if (!firestorePromise) {
    firestorePromise = import('./db-firestore')
  }
  return firestorePromise
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findUserById(id: string) {
  if (isFirestore) return (await firestore()).findUserById(id)
  return sqlite.findUserById(id)
}

export async function findUserByPhoneNumber(phoneNumber: string) {
  if (isFirestore) return (await firestore()).findUserByPhoneNumber(phoneNumber)
  return sqlite.findUserByPhoneNumber(phoneNumber)
}

export async function createUser(username: string, phoneNumber: string, passwordHash: string) {
  if (isFirestore) return (await firestore()).createUser(username, phoneNumber, passwordHash)
  return sqlite.createUser(username, phoneNumber, passwordHash)
}

export async function findOrCreateUser(username: string, phoneNumber: string) {
  if (isFirestore) return (await firestore()).findOrCreateUser(username, phoneNumber)
  return sqlite.findOrCreateUser(username, phoneNumber)
}

export async function getAllUsers() {
  if (isFirestore) return (await firestore()).getAllUsers()
  return sqlite.getAllUsers()
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function addContact(userId: string, phoneNumber: string) {
  if (isFirestore) return (await firestore()).addContact(userId, phoneNumber)
  return sqlite.addContact(userId, phoneNumber)
}

export async function removeContact(userId: string, contactId: string) {
  if (isFirestore) return (await firestore()).removeContact(userId, contactId)
  return sqlite.removeContact(userId, contactId)
}

export async function getContacts(userId: string) {
  if (isFirestore) return (await firestore()).getContacts(userId)
  return sqlite.getContacts(userId)
}

// ---------------------------------------------------------------------------
// Conversations & participants
// ---------------------------------------------------------------------------

export async function getOrCreateDMConversation(user1Id: string, user2Id: string, createdBy?: string) {
  if (isFirestore) return (await firestore()).getOrCreateDMConversation(user1Id, user2Id, createdBy)
  return sqlite.getOrCreateDMConversation(user1Id, user2Id, createdBy)
}

export async function getConversations(userId: string) {
  if (isFirestore) return (await firestore()).getConversations(userId)
  return sqlite.getConversations(userId)
}

export async function addParticipant(conversationId: string, userId: string) {
  if (isFirestore) return (await firestore()).addParticipant(conversationId, userId)
  return sqlite.addParticipant(conversationId, userId)
}

export async function isParticipant(conversationId: string, userId: string) {
  if (isFirestore) return (await firestore()).isParticipant(conversationId, userId)
  return sqlite.isParticipant(conversationId, userId)
}

export async function deleteConversation(conversationId: string, userId: string) {
  if (isFirestore) return (await firestore()).deleteConversation(conversationId, userId)
  return sqlite.deleteConversation(conversationId, userId)
}

export async function wipeConversation(conversationId: string, userId: string) {
  if (isFirestore) return (await firestore()).wipeConversation(conversationId, userId)
  return sqlite.wipeConversation(conversationId, userId)
}

export async function getConversationParticipantIds(conversationId: string) {
  if (isFirestore) return (await firestore()).getConversationParticipantIds(conversationId)
  return sqlite.getConversationParticipantIds(conversationId)
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function createMessage(
  senderId: string,
  conversationId: string,
  content: string,
  file?: { url: string; ext: string; size: number },
  customRId?: string,
  replyToRId?: string,
) {
  if (isFirestore) {
    return (await firestore()).createMessage(senderId, conversationId, content, file, customRId, replyToRId)
  }
  return sqlite.createMessage(senderId, conversationId, content, file, customRId, replyToRId)
}

export async function getMessages(
  conversationId: string,
  userId: string,
  page: number = 1,
  perPage: number = 15,
) {
  if (isFirestore) return (await firestore()).getMessages(conversationId, userId, page, perPage)
  return sqlite.getMessages(conversationId, userId, page, perPage)
}

export async function deleteMessage(messageId: string, userId: string, mode: 'me' | 'all') {
  if (isFirestore) return (await firestore()).deleteMessage(messageId, userId, mode)
  return sqlite.deleteMessage(messageId, userId, mode)
}

export async function markDelivered(messageId: string) {
  if (isFirestore) return (await firestore()).markDelivered(messageId)
  return sqlite.markDelivered(messageId)
}

export async function markRead(conversationId: string, userId: string) {
  if (isFirestore) return (await firestore()).markRead(conversationId, userId)
  return sqlite.markRead(conversationId, userId)
}

export async function getFileConversationId(filename: string) {
  if (isFirestore) return (await firestore()).getFileConversationId(filename)
  return sqlite.getFileConversationId(filename)
}

// ---------------------------------------------------------------------------
// Reply lookup (replaces the raw SQL query that messages.post used via getDb)
// Returns { rId, sender_id, sender_name, content } or null.
// ---------------------------------------------------------------------------

export async function getMessageByRId(rId: string) {
  if (isFirestore) {
    const fire = await firestore()
    // Dynamic-imported module; use its internal exports.
    const mod = fire as any
    const fbDb = mod.fbDb
    const { collection, query, where, limit, getDocs } = await import('firebase/firestore')
    const q = query(
      collection(fbDb, 'messages'),
      where('rId', '==', rId),
      limit(1),
    )
    const snap = await getDocs(q)
    if (snap.empty) return null
    const docData: any = snap.docs[0].data()
    const sender = await fire.findUserById(docData.sender_id)
    return {
      rId: docData.rId,
      sender_id: docData.sender_id,
      sender_name: sender?.username ?? '',
      content: docData.content ?? '',
    }
  }

  const db = sqlite.getDb()
  const row = db
    .prepare(
      `SELECT m.rId, m.content, m.sender_id, u.username as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.rId = ?`,
    )
    .get(rId) as
    | { rId: string; sender_id: string; sender_name: string; content: string }
    | undefined
  return row ?? null
}

// ---------------------------------------------------------------------------
// Raw SQLite access — ONLY available in sqlite mode. Kept for the WebSocket
// handler and any legacy code paths; throws loudly in firestore mode so we
// notice any missed migration spot.
// ---------------------------------------------------------------------------

export async function getDb() {
  if (isFirestore) {
    throw new Error('getDb() is not available in DB_MODE=firestore — use facade functions instead')
  }
  return sqlite.getDb()
}
