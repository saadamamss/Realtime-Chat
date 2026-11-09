// SQLite → Firestore data migration script
// Usage: node migrate-sqlite-to-firestore.mjs
// Make sure Firestore is created (test mode) and .env has Firebase credentials

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection, doc,
  setDoc, getDocs, writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import 'dotenv/config'

console.log('🚀 Starting SQLite → Firestore migration...\n')

// ---------- Config check ----------
const required = [
  'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'
]
const missing = required.filter(k => !process.env[k])
if (missing.length > 0) {
  console.log('❌ Missing Firebase credentials:', missing.join(', '))
  console.log('Add them to your .env file first.')
  process.exit(1)
}

// ---------- Init Firebase ----------
const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
})
const db = getFirestore(app)

// ---------- Init SQLite ----------
const dbPath = path.resolve(process.cwd(), 'data', 'chat.db')
if (!fs.existsSync(dbPath)) {
  console.log('❌ SQLite database not found at:', dbPath)
  process.exit(1)
}
const sqlite = new Database(dbPath, { readonly: true })
console.log('✅ SQLite database opened:', dbPath)

// Firestore batch limit is 500 operations
const BATCH_SIZE = 450

// Warning before overwriting
const existing = await getDocs(collection(db, 'users'))
if (!existing.empty) {
  console.log(`⚠️  WARNING: Firestore 'users' collection already has ${existing.size} document(s).`)
  console.log('   Documents with the same ID will be OVERWRITTEN.')
  console.log('   Press Ctrl+C to abort, or wait 5 seconds to continue...')
  await new Promise(r => setTimeout(r, 5000))
}

// Helper: run batches while tracking statements
let ops = 0
let batch = writeBatch(db)

async function commitBatch() {
  if (ops === 0) return
  try {
    await batch.commit()
    console.log(`   ✓ Committed batch (${ops} ops)`)
  } catch (err) {
    console.error('   ✗ Batch commit failed:', err.message)
    throw err
  }
  ops = 0
  batch = writeBatch(db)
}

function addToBatch(ref, data) {
  batch.set(ref, data)
  ops++
  if (ops >= BATCH_SIZE) {
    return commitBatch()
  }
}

// Convert SQLite datetime strings to Firestore-compatible ISO dates
function toIso(value) {
  if (!value) return null
  if (value.includes('T')) return value
  return value.replace(' ', 'T') + 'Z'
}

// ---------- Migrate users ----------
console.log('\n👥 Migrating users...')
const users = sqlite.prepare('SELECT * FROM users').all()
for (const u of users) {
  const ref = doc(db, 'users', u.id)
  await addToBatch(ref, {
    id: u.id,
    username: u.username,
    phone_number: u.phone_number || '',
    avatar: u.avatar || '',
    password_hash: u.password_hash || null,
    created_at: toIso(u.created_at) || serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${users.length} users processed`)

// ---------- Migrate contacts ----------
console.log('\n📇 Migrating contacts...')
const contacts = sqlite.prepare('SELECT * FROM contacts').all()
for (const c of contacts) {
  const ref = doc(db, 'contacts', c.user_id, 'contacts', c.contact_id)
  await addToBatch(ref, {
    contact_id: c.contact_id,
    created_at: toIso(c.created_at) || serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${contacts.length} contacts processed`)

// ---------- Migrate conversations ----------
console.log('\n💬 Migrating conversations...')
const conversations = sqlite.prepare('SELECT * FROM conversations').all()
for (const c of conversations) {
  const ref = doc(db, 'conversations', c.id)
  await addToBatch(ref, {
    id: c.id,
    name: c.name || null,
    created_by: c.created_by || null,
    created_at: toIso(c.created_at) || serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${conversations.length} conversations processed`)

// ---------- Migrate participants ----------
console.log('\n👪 Migrating participants...')
const participants = sqlite.prepare('SELECT * FROM conversation_participants').all()
for (const p of participants) {
  const ref = doc(db, 'participants', p.conversation_id, 'participants', p.user_id)
  await addToBatch(ref, {
    user_id: p.user_id,
    conversation_id: p.conversation_id,
    hidden: !!p.hidden,
    deleted_at: p.deleted_at ? toIso(p.deleted_at) : null,
    joined_at: serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${participants.length} participants processed`)

// ---------- Migrate messages ----------
console.log('\n✉️  Migrating messages...')
const messages = sqlite.prepare('SELECT * FROM messages').all()
for (const m of messages) {
  const ref = doc(db, 'messages', String(m.id))
  await addToBatch(ref, {
    rId: m.rId,
    id: String(m.id),
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    content: m.content || '',
    file_url: m.file_url || '',
    file_extension: m.file_extension || '',
    file_size: m.file_size || 0,
    reply_to_rId: m.reply_to_rId || null,
    delivered_at: m.delivered_at ? toIso(m.delivered_at) : null,
    read_at: m.read_at ? toIso(m.read_at) : null,
    created_at: toIso(m.created_at) || serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${messages.length} messages processed`)

// ---------- Migrate message deletions ----------
console.log('\n🗑️  Migrating message deletions...')
const deletions = sqlite.prepare('SELECT * FROM message_deletions').all()
for (const d of deletions) {
  const ref = doc(db, 'message_deletions', d.message_rId, 'deletions', d.user_id)
  await addToBatch(ref, {
    user_id: d.user_id,
    created_at: toIso(d.created_at) || serverTimestamp(),
  })
}
await commitBatch()
console.log(`   ${deletions.length} message deletions processed`)

// ---------- Validation ----------
console.log('\n📊 Validating migration...')
const counts = {
  users: users.length,
  contacts: contacts.length,
  conversations: conversations.length,
  participants: participants.length,
  messages: messages.length,
  deletions: deletions.length
}

// Get server-side counts (client SDK - use subquery on users only for simplicity)
const fnUsers = await getDocs(collection(db, 'users'))
const fnMessages = await getDocs(collection(db, 'messages'))

console.log('┌───────────────┬─────────┬──────────┐')
console.log('│ Table         │ SQLite  │ Firestore│')
console.log('├───────────────┼─────────┼──────────┤')
console.log(`│ users         │ ${String(counts.users).padStart(7)} │ ${String(fnUsers.size).padStart(8)} │`)
console.log(`│ contacts      │ ${String(counts.contacts).padStart(7)} │ (subcoll)│`)
console.log(`│ conversations │ ${String(counts.conversations).padStart(7)} │ (pending)│`)
console.log(`│ participants  │ ${String(counts.participants).padStart(7)} │ (subcoll)│`)
console.log(`│ messages      │ ${String(counts.messages).padStart(7)} │ ${String(fnMessages.size).padStart(8)} │`)
console.log(`│ deletions     │ ${String(counts.deletions).padStart(7)} │ (subcoll)│`)
console.log('└───────────────┴─────────┴──────────┘')

sqlite.close()

console.log('\n🎉 Migration completed!')
console.log('\n📋 Next steps:')
console.log('1. Verify data in the Firebase Console (Firestore Database section)')
console.log('2. Set up Firebase Authentication in the Console')
console.log('3. Update your app to use Firestore endpoints')
console.log('4. Test all chat functionality')
