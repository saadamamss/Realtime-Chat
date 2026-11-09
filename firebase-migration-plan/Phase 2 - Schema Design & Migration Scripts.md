# Phase 2: Schema Design & Migration Scripts

## Overview
This phase focuses on designing the Firestore document structure to replace the SQLite schema and creating migration scripts to transfer existing data.

## Current SQLite Schema vs Firestore Design

### SQLite Tables Structure
```
users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  phone_number TEXT UNIQUE,
  avatar TEXT,
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)

contacts (
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, contact_id)
)

conversations (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)

conversation_participants (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  hidden INTEGER DEFAULT 0,
  deleted_at TEXT,
  PRIMARY KEY (conversation_id, user_id)
)

messages (
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
  created_at TEXT DEFAULT (datetime('now'))
)

message_deletions (
  message_rId TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (message_rId, user_id)
)
```

### Firestore Document Structure
```
users/{userId}
  - id: string
  - username: string
  - phone_number: string
  - avatar: string
  - password_hash: string
  - created_at: timestamp
  - updated_at: timestamp

conversations/{conversationId}
  - id: string
  - name: string
  - created_by: string
  - created_at: timestamp
  - updated_at: timestamp

participants/{conversationId}/{userId}
  - user_id: string
  - conversation_id: string
  - hidden: boolean
  - deleted_at: timestamp | null
  - joined_at: timestamp

messages/{messageId}
  - rId: string
  - id: string
  - conversation_id: string
  - sender_id: string
  - content: string
  - file_url: string
  - file_extension: string
  - file_size: number
  - reply_to_rId: string | null
  - delivered_at: timestamp | null
  - read_at: timestamp | null
  - created_at: timestamp
  - updated_at: timestamp

contacts/{userId}/{contactId}
  - user_id: string
  - contact_id: string
  - created_at: timestamp
  - updated_at: timestamp

message_deletions/{messageRId}/{userId}
  - message_rId: string
  - user_id: string
  - created_at: timestamp
```

## Tasks

### 2.1 Schema Design
- [ ] Design Firestore document structure
- [ ] Define subcollections and relationships
- [ ] Create Firestore security rules
- [ ] Design indexes for optimal queries

### 2.2 Migration Scripts
- [ ] Create SQLite to Firestore migration script
- [ ] Implement data transformation functions
- [ ] Create batch processing for large datasets
- [ ] Implement error handling and logging

### 2.3 Schema Validation
- [ ] Create data validation functions
- [ ] Implement data integrity checks
- [ ] Create backup procedures
- [ ] Test migration with sample data

## Implementation Files

### 2.1 Firestore Schema Design

#### `firestore.schema.ts`
```typescript
export const FirestoreCollections = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  PARTICIPANTS: 'participants',
  MESSAGES: 'messages',
  CONTACTS: 'contacts',
  MESSAGE_DELETIONS: 'message_deletions'
} as const

export interface FirestoreUser {
  id: string
  username: string
  phone_number: string
  avatar: string
  password_hash?: string
  created_at: Date
  updated_at: Date
}

export interface FirestoreConversation {
  id: string
  name?: string
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface FirestoreParticipant {
  user_id: string
  conversation_id: string
  hidden: boolean
  deleted_at: Date | null
  joined_at: Date
}

export interface FirestoreMessage {
  rId: string
  id: string
  conversation_id: string
  sender_id: string
  content: string
  file_url: string
  file_extension: string
  file_size: number
  reply_to_rId: string | null
  delivered_at: Date | null
  read_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface FirestoreContact {
  user_id: string
  contact_id: string
  created_at: Date
  updated_at: Date
}

export interface FirestoreMessageDeletion {
  message_rId: string
  user_id: string
  created_at: Date
}
```

#### `firestore.security-rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Conversations collection
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(conversationId)/$(request.auth.uid));
    }
    
    // Participants subcollection
    match /participants/{conversationId}/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(request.resource.data.conversation_id)/$(request.auth.uid));
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(request.resource.data.conversation_id)/$(request.auth.uid));
      allow delete: if request.auth != null && 
        (request.auth.uid == request.resource.data.sender_id || 
         exists(/databases/$(database)/documents/message_deletions/$(request.resource.data.rId)/$(request.auth.uid)));
    }
    
    // Contacts collection
    match /contacts/{userId}/{contactId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Message deletions collection
    match /message_deletions/{messageRId}/{userId} {
      allow create: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2.2 Migration Scripts

#### `migrate-sqlite-to-firestore.ts`
```typescript
import { getDb } from '../server/utils/db'
import { adminDb } from './firebase.admin.config'
import {
  FirestoreUser,
  FirestoreConversation,
  FirestoreParticipant,
  FirestoreMessage,
  FirestoreContact,
  FirestoreMessageDeletion
} from './firestore.schema'

export async function migrateUsers() {
  const db = getDb()
  const users = db.prepare('SELECT * FROM users').all() as any[]
  
  const batch = adminDb.batch()
  
  for (const user of users) {
    const firestoreUser: FirestoreUser = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number || '',
      avatar: user.avatar || '',
      password_hash: user.password_hash || '',
      created_at: new Date(user.created_at),
      updated_at: new Date()
    }
    
    const ref = adminDb.collection('users').doc(user.id)
    batch.set(ref, firestoreUser)
  }
  
  await batch.commit()
  console.log(`Migrated ${users.length} users`)
}

export async function migrateConversations() {
  const db = getDb()
  const conversations = db.prepare('SELECT * FROM conversations').all() as any[]
  
  const batch = adminDb.batch()
  
  for (const conv of conversations) {
    const firestoreConv: FirestoreConversation = {
      id: conv.id,
      name: conv.name || null,
      created_by: conv.created_by || null,
      created_at: new Date(conv.created_at),
      updated_at: new Date()
    }
    
    const ref = adminDb.collection('conversations').doc(conv.id)
    batch.set(ref, firestoreConv)
  }
  
  await batch.commit()
  console.log(`Migrated ${conversations.length} conversations`)
}

export async function migrateParticipants() {
  const db = getDb()
  const participants = db.prepare('SELECT * FROM conversation_participants').all() as any[]
  
  const batch = adminDb.batch()
  
  for (const participant of participants) {
    const firestoreParticipant: FirestoreParticipant = {
      user_id: participant.user_id,
      conversation_id: participant.conversation_id,
      hidden: !!participant.hidden,
      deleted_at: participant.deleted_at ? new Date(participant.deleted_at) : null,
      joined_at: new Date()
    }
    
    const ref = adminDb
      .collection('participants')
      .doc(participant.conversation_id)
      .doc(participant.user_id)
    
    batch.set(ref, firestoreParticipant)
  }
  
  await batch.commit()
  console.log(`Migrated ${participants.length} participants`)
}

export async function migrateMessages() {
  const db = getDb()
  const messages = db.prepare('SELECT * FROM messages').all() as any[]
  
  const batch = adminDb.batch()
  const batchSize = 500
  const batches = []
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batchMessages = messages.slice(i, i + batchSize)
    const subBatch = adminDb.batch()
    
    for (const message of batchMessages) {
      const firestoreMessage: FirestoreMessage = {
        rId: message.rId,
        id: message.id.toString(),
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        file_url: message.file_url,
        file_extension: message.file_extension,
        file_size: message.file_size,
        reply_to_rId: message.reply_to_rId,
        delivered_at: message.delivered_at ? new Date(message.delivered_at) : null,
        read_at: message.read_at ? new Date(message.read_at) : null,
        created_at: new Date(message.created_at),
        updated_at: new Date()
      }
      
      const ref = adminDb.collection('messages').doc(message.id.toString())
      subBatch.set(ref, firestoreMessage)
    }
    
    batches.push(subBatch.commit())
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(messages.length / batchSize)}`)
  }
  
  await Promise.all(batches)
  console.log(`Migrated ${messages.length} messages`)
}

export async function migrateContacts() {
  const db = getDb()
  const contacts = db.prepare('SELECT * FROM contacts').all() as any[]
  
  const batch = adminDb.batch()
  
  for (const contact of contacts) {
    const firestoreContact: FirestoreContact = {
      user_id: contact.user_id,
      contact_id: contact.contact_id,
      created_at: new Date(contact.created_at),
      updated_at: new Date()
    }
    
    const ref = adminDb
      .collection('contacts')
      .doc(contact.user_id)
      .doc(contact.contact_id)
    
    batch.set(ref, firestoreContact)
  }
  
  await batch.commit()
  console.log(`Migrated ${contacts.length} contacts`)
}

export async function migrateMessageDeletions() {
  const db = getDb()
  const deletions = db.prepare('SELECT * FROM message_deletions').all() as any[]
  
  const batch = adminDb.batch()
  
  for (const deletion of deletions) {
    const firestoreDeletion: FirestoreMessageDeletion = {
      message_rId: deletion.message_rId,
      user_id: deletion.user_id,
      created_at: new Date(deletion.created_at)
    }
    
    const ref = adminDb
      .collection('message_deletions')
      .doc(deletion.message_rId)
      .doc(deletion.user_id)
    
    batch.set(ref, firestoreDeletion)
  }
  
  await batch.commit()
  console.log(`Migrated ${deletions.length} message deletions`)
}

export async function runFullMigration() {
  console.log('Starting SQLite to Firestore migration...')
  
  try {
    await migrateUsers()
    await migrateConversations()
    await migrateParticipants()
    await migrateMessages()
    await migrateContacts()
    await migrateMessageDeletions()
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
```

#### `migration-utils.ts`
```typescript
import { adminDb } from './firebase.admin.config'
import { getDb } from '../server/utils/db'

export class MigrationUtils {
  static async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `backups/migration-${timestamp}.json`
    
    // Get all data from SQLite
    const db = getDb()
    const data = {
      users: db.prepare('SELECT * FROM users').all(),
      conversations: db.prepare('SELECT * FROM conversations').all(),
      participants: db.prepare('SELECT * FROM conversation_participants').all(),
      messages: db.prepare('SELECT * FROM messages').all(),
      contacts: db.prepare('SELECT * FROM contacts').all(),
      message_deletions: db.prepare('SELECT * FROM message_deletions').all()
    }
    
    // Save backup to Firebase Storage
    const bucket = adminDb.storage().bucket()
    const file = bucket.file(backupPath)
    
    await file.save(JSON.stringify(data, null, 2), {
      metadata: {
        contentType: 'application/json'
      }
    })
    
    console.log(`Backup created at ${backupPath}`)
    return backupPath
  }
  
  static async validateMigration() {
    const db = getDb()
    
    // Count records in SQLite
    const sqliteCounts = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      conversations: db.prepare('SELECT COUNT(*) as count FROM conversations').get().count,
      participants: db.prepare('SELECT COUNT(*) as count FROM conversation_participants').get().count,
      messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
      contacts: db.prepare('SELECT COUNT(*) as count FROM contacts').get().count,
      message_deletions: db.prepare('SELECT COUNT(*) as count FROM message_deletions').get().count
    }
    
    // Count records in Firestore
    const firestoreCounts = {
      users: (await adminDb.collection('users').get()).size,
      conversations: (await adminDb.collection('conversations').get()).size,
      participants: (await adminDb.collectionGroup('participants').get()).size,
      messages: (await adminDb.collection('messages').get()).size,
      contacts: (await adminDb.collectionGroup('contacts').get()).size,
      message_deletions: (await adminDb.collectionGroup('message_deletions').get()).size
    }
    
    console.log('SQLite counts:', sqliteCounts)
    console.log('Firestore counts:', firestoreCounts)
    
    // Validate counts match
    const validation = {
      passed: true,
      differences: {} as any
    }
    
    for (const [key, sqliteCount] of Object.entries(sqliteCounts)) {
      const firestoreCount = firestoreCounts[key]
      if (sqliteCount !== firestoreCount) {
        validation.differences[key] = {
          sqlite: sqliteCount,
          firestore: firestoreCount,
          match: false
        }
        validation.passed = false
      }
    }
    
    return validation
  }
}
```

### 2.3 Schema Validation

#### `schema-validation.ts`
```typescript
import { adminDb } from './firebase.admin.config'
import { FirestoreUser, FirestoreConversation, FirestoreMessage } from './firestore.schema'

export class SchemaValidator {
  static async validateUser(user: any): Promise<FirestoreUser> {
    if (!user.id || typeof user.id !== 'string') {
      throw new Error('Invalid user ID')
    }
    
    if (!user.username || typeof user.username !== 'string') {
      throw new Error('Invalid username')
    }
    
    if (!user.phone_number || typeof user.phone_number !== 'string') {
      throw new Error('Invalid phone number')
    }
    
    return {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      avatar: user.avatar || '',
      password_hash: user.password_hash || '',
      created_at: user.created_at ? new Date(user.created_at) : new Date(),
      updated_at: new Date()
    }
  }
  
  static async validateConversation(conv: any): Promise<FirestoreConversation> {
    if (!conv.id || typeof conv.id !== 'string') {
      throw new Error('Invalid conversation ID')
    }
    
    if (!conv.created_by || typeof conv.created_by !== 'string') {
      throw new Error('Invalid created_by field')
    }
    
    return {
      id: conv.id,
      name: conv.name || null,
      created_by: conv.created_by,
      created_at: conv.created_at ? new Date(conv.created_at) : new Date(),
      updated_at: new Date()
    }
  }
  
  static async validateMessage(msg: any): Promise<FirestoreMessage> {
    if (!msg.rId || typeof msg.rId !== 'string') {
      throw new Error('Invalid message rId')
    }
    
    if (!msg.conversation_id || typeof msg.conversation_id !== 'string') {
      throw new Error('Invalid conversation ID')
    }
    
    if (!msg.sender_id || typeof msg.sender_id !== 'string') {
      throw new Error('Invalid sender ID')
    }
    
    return {
      rId: msg.rId,
      id: msg.id.toString(),
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content || '',
      file_url: msg.file_url || '',
      file_extension: msg.file_extension || '',
      file_size: msg.file_size || 0,
      reply_to_rId: msg.reply_to_rId || null,
      delivered_at: msg.delivered_at ? new Date(msg.delivered_at) : null,
      read_at: msg.read_at ? new Date(msg.read_at) : null,
      created_at: msg.created_at ? new Date(msg.created_at) : new Date(),
      updated_at: new Date()
    }
  }
}
```

## Testing Checklist

### 2.1 Schema Design
- [ ] Firestore document structure is designed
- [ ] Relationships between documents are clearly defined
- [ ] Security rules are implemented and tested
- [ ] Required indexes are created

### 2.2 Migration Scripts
- [ ] Migration script is created and tested
- [ ] Data transformation functions work correctly
- [ ] Batch processing handles large datasets
- [ ] Error handling and logging is implemented

### 2.3 Schema Validation
- [ ] Data validation functions are implemented
- [ ] Data integrity checks are working
- [ ] Backup procedures are tested
- [ ] Migration validation script works correctly

## Potential Issues and Solutions

### Issue: Data type conversion
**Solution**: Implement proper type conversion from SQLite to Firestore

### Issue: Large dataset migration
**Solution**: Use batch processing and handle rate limits

### Issue: Data integrity during migration
**Solution**: Implement validation and backup procedures

## Next Steps
After completing Phase 2, proceed to Phase 3: Backend Implementation