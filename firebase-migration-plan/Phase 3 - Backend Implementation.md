# Phase 3: Backend Implementation

## Overview
This phase focuses on replacing the SQLite database layer with Firestore, implementing Firebase Authentication, migrating file uploads to Firebase Storage, and updating the real-time messaging system.

## Tasks

### 3.1 Database Layer Replacement
- [ ] Replace SQLite utility functions with Firestore equivalents
- [ ] Update database operations in API routes
- [ ] Implement Firestore transactions
- [ ] Optimize Firestore queries

### 3.2 Firebase Authentication Integration
- [ ] Replace JWT authentication with Firebase Auth
- [ ] Update authentication middleware
- [ Implement session management with Firebase Auth
- [ ] Test authentication flow

### 3.3 File Storage Migration
- [ ] Migrate local file uploads to Firebase Storage
- [ ] Update file handling in API routes
- [ ] Implement file URL generation
- [ ] Test file upload/download functionality

### 3.4 Real-time Messaging System
- [ ] Replace WebSocket system with Firestore listeners
- [ ] Implement real-time updates
- [ ] Update presence tracking
- [ ] Test real-time performance

## Implementation Files

### 3.1 Database Layer Replacement

#### `server/utils/db-firestore.ts`
```typescript
import { db, auth } from '../firebase.config'
import { adminDb, adminAuth } from '../firebase.admin.config'
import {
  FirestoreUser,
  FirestoreConversation,
  FirestoreParticipant,
  FirestoreMessage,
  FirestoreContact,
  FirestoreMessageDeletion
} from '../firestore.schema'

// User operations
export async function findOrCreateUser(username: string, phoneNumber: string): Promise<FirestoreUser> {
  try {
    // Check if user exists by phone number
    const usersQuery = db.collection('users').where('phone_number', '==', phoneNumber)
    const userSnapshot = await usersQuery.get()
    
    if (!userSnapshot.empty) {
      // User exists, update username and return
      const userDoc = userSnapshot.docs[0]
      await userDoc.ref.update({
        username,
        updated_at: new Date()
      })
      
      const userData = userDoc.data() as FirestoreUser
      return { ...userData, updated_at: new Date() }
    } else {
      // Create new user
      const userId = auth.currentUser?.uid || generateUserId()
      const newUser: FirestoreUser = {
        id: userId,
        username,
        phone_number: phoneNumber,
        avatar: generateAvatarUrl(username),
        created_at: new Date(),
        updated_at: new Date()
      }
      
      await db.collection('users').doc(userId).set(newUser)
      return newUser
    }
  } catch (error) {
    console.error('Error in findOrCreateUser:', error)
    throw error
  }
}

export async function findUserByPhoneNumber(phoneNumber: string): Promise<FirestoreUser | null> {
  try {
    const usersQuery = db.collection('users').where('phone_number', '==', phoneNumber)
    const userSnapshot = await usersQuery.get()
    
    if (userSnapshot.empty) {
      return null
    }
    
    const userDoc = userSnapshot.docs[0]
    return userDoc.data() as FirestoreUser
  } catch (error) {
    console.error('Error in findUserByPhoneNumber:', error)
    throw error
  }
}

export async function findUserById(id: string): Promise<FirestoreUser | null> {
  try {
    const userDoc = await db.collection('users').doc(id).get()
    
    if (!userDoc.exists) {
      return null
    }
    
    return userDoc.data() as FirestoreUser
  } catch (error) {
    console.error('Error in findUserById:', error)
    throw error
  }
}

export async function createUser(username: string, phoneNumber: string, passwordHash: string): Promise<FirestoreUser> {
  try {
    const userId = generateUserId()
    const newUser: FirestoreUser = {
      id: userId,
      username,
      phone_number: phoneNumber,
      avatar: generateAvatarUrl(username),
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    await db.collection('users').doc(userId).set(newUser)
    return newUser
  } catch (error) {
    console.error('Error in createUser:', error)
    throw error
  }
}

// Contact operations
export async function addContact(userId: string, phoneNumber: string): Promise<FirestoreContact | null> {
  try {
    // Find the contact user
    const contactUser = await findUserByPhoneNumber(phoneNumber)
    if (!contactUser || contactUser.id === userId) {
      return null
    }
    
    // Check if contact already exists
    const contactQuery = db.collection('contacts')
      .doc(userId)
      .collection('contacts')
      .doc(contactUser.id)
    
    const contactDoc = await contactQuery.get()
    
    if (!contactDoc.exists) {
      const newContact: FirestoreContact = {
        user_id: userId,
        contact_id: contactUser.id,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      await contactQuery.set(newContact)
      
      return {
        id: contactUser.id,
        name: contactUser.username,
        phone_number: contactUser.phone_number,
        image: contactUser.avatar
      }
    }
    
    return null
  } catch (error) {
    console.error('Error in addContact:', error)
    throw error
  }
}

export async function removeContact(userId: string, contactId: string): Promise<boolean> {
  try {
    await db
      .collection('contacts')
      .doc(userId)
      .collection('contacts')
      .doc(contactId)
      .delete()
    
    return true
  } catch (error) {
    console.error('Error in removeContact:', error)
    return false
  }
}

export async function getContacts(userId: string): Promise<FirestoreContact[]> {
  try {
    const contactsQuery = db
      .collection('contacts')
      .doc(userId)
      .collection('contacts')
    
    const contactsSnapshot = await contactsQuery.get()
    
    const contacts: FirestoreContact[] = []
    for (const doc of contactsSnapshot.docs) {
      contacts.push(doc.data() as FirestoreContact)
    }
    
    return contacts
  } catch (error) {
    console.error('Error in getContacts:', error)
    throw error
  }
}

// Conversation operations
export async function getOrCreateDMConversation(user1Id: string, user2Id: string, createdBy?: string): Promise<FirestoreConversation> {
  try {
    const ids = [user1Id, user2Id].sort()
    const name = `dm:${ids[0]}:${ids[1]}`
    
    // Check if conversation exists
    const convQuery = db.collection('conversations').where('name', '==', name)
    const convSnapshot = await convQuery.get()
    
    if (!convSnapshot.empty) {
      // Conversation exists, ensure both users are participants
      const convDoc = convSnapshot.docs[0]
      const convData = convDoc.data() as FirestoreConversation
      
      await addParticipant(convData.id, user1Id)
      await addParticipant(convData.id, user2Id)
      
      return convData
    } else {
      // Create new conversation
      const conversationId = generateConversationId()
      const newConv: FirestoreConversation = {
        id: conversationId,
        name,
        created_by: createdBy || user1Id,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      await db.collection('conversations').doc(conversationId).set(newConv)
      
      // Add participants
      await addParticipant(conversationId, user1Id)
      await addParticipant(conversationId, user2Id)
      
      return newConv
    }
  } catch (error) {
    console.error('Error in getOrCreateDMConversation:', error)
    throw error
  }
}

export async function addParticipant(conversationId: string, userId: string): Promise<void> {
  try {
    const participantRef = db
      .collection('participants')
      .doc(conversationId)
      .doc(userId)
    
    // Check if participant exists
    const participantDoc = await participantRef.get()
    
    if (participantDoc.exists) {
      // Update existing participant
      await participantRef.update({
        hidden: false,
        deleted_at: null,
        updated_at: new Date()
      })
    } else {
      // Create new participant
      const newParticipant: FirestoreParticipant = {
        user_id: userId,
        conversation_id: conversationId,
        hidden: false,
        deleted_at: null,
        joined_at: new Date()
      }
      
      await participantRef.set(newParticipant)
    }
  } catch (error) {
    console.error('Error in addParticipant:', error)
    throw error
  }
}

export async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  try {
    const participantDoc = await db
      .collection('participants')
      .doc(conversationId)
      .doc(userId)
      .get()
    
    return participantDoc.exists && !participantDoc.data()?.deleted_at
  } catch (error) {
    console.error('Error in isParticipant:', error)
    return false
  }
}

export async function wipeConversation(conversationId: string, userId: string): Promise<void> {
  try {
    await db
      .collection('participants')
      .doc(conversationId)
      .doc(userId)
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      })
  } catch (error) {
    console.error('Error in wipeConversation:', error)
    throw error
  }
}

export async function deleteConversation(conversationId: string, userId: string): Promise<void> {
  try {
    await db
      .collection('participants')
      .doc(conversationId)
      .doc(userId)
      .update({
        hidden: true,
        deleted_at: new Date(),
        updated_at: new Date()
      })
  } catch (error) {
    console.error('Error in deleteConversation:', error)
    throw error
  }
}

export async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
  try {
    const participantsQuery = db
      .collection('participants')
      .doc(conversationId)
      .collection('participants')
      .where('hidden', '==', false)
      .where('deleted_at', '==', null)
    
    const participantsSnapshot = await participantsQuery.get()
    
    return participantsSnapshot.docs.map(doc => doc.data().user_id)
  } catch (error) {
    console.error('Error in getConversationParticipantIds:', error)
    throw error
  }
}

export async function getConversations(userId: string): Promise<FirestoreConversation[]> {
  try {
    const participantsQuery = db
      .collection('participants')
      .doc(userId)
      .collection('participants')
      .where('hidden', '==', false)
      .where('deleted_at', '==', null)
    
    const participantsSnapshot = await participantsQuery.get()
    
    const conversationIds = participantsSnapshot.docs.map(doc => doc.data().conversation_id)
    
    if (conversationIds.length === 0) {
      return []
    }
    
    const conversationsQuery = db
      .collection('conversations')
      .where(adminDb.firestore.FieldPath.documentId(), 'in', conversationIds)
    
    const conversationsSnapshot = await conversationsQuery.get()
    
    return conversationsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as FirestoreConversation[]
  } catch (error) {
    console.error('Error in getConversations:', error)
    throw error
  }
}

// Message operations
export async function createMessage(
  senderId: string,
  conversationId: string,
  content: string,
  file?: { url: string; ext: string; size: number },
  customRId?: string,
  replyToRId?: string
): Promise<FirestoreMessage> {
  try {
    const messageId = generateMessageId()
    const rId = customRId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newMessage: FirestoreMessage = {
      rId,
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      file_url: file?.url || '',
      file_extension: file?.ext || '',
      file_size: file?.size || 0,
      reply_to_rId: replyToRId || null,
      delivered_at: null,
      read_at: null,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    await db.collection('messages').doc(messageId).set(newMessage)
    return newMessage
  } catch (error) {
    console.error('Error in createMessage:', error)
    throw error
  }
}

export async function getMessages(conversationId: string, userId: string, page: number = 1, perPage: number = 15): Promise<{
  data: Record<string, FirestoreMessage[]>
  last_page: number
  total: number
}> {
  try {
    // Check if user is a participant
    const isParticipantDoc = await db
      .collection('participants')
      .doc(conversationId)
      .doc(userId)
      .get()
    
    if (!isParticipantDoc.exists || isParticipantDoc.data()?.deleted_at) {
      throw new Error('User is not a participant in this conversation')
    }
    
    const messagesQuery = db
      .collection('messages')
      .where('conversation_id', '==', conversationId)
      .orderBy('created_at', 'desc')
      .limit(perPage)
    
    const messagesSnapshot = await messagesQuery.get()
    
    const messages = messagesSnapshot.docs.map(doc => doc.data() as FirestoreMessage)
    
    // Check for message deletions
    const deletedMessageIds = []
    for (const message of messages) {
      const deletionDoc = await db
        .collection('message_deletions')
        .doc(message.rId)
        .doc(userId)
        .get()
      
      if (deletionDoc.exists) {
        deletedMessageIds.push(message.id)
      }
    }
    
    // Filter out deleted messages
    const filteredMessages = messages.filter(msg => !deletedMessageIds.includes(msg.id))
    
    // Group by date
    const grouped: Record<string, FirestoreMessage[]> = {}
    for (const message of filteredMessages.reverse()) {
      const date = message.created_at.toISOString().split('T')[0]
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(message)
    }
    
    const total = filteredMessages.length
    const lastPage = Math.ceil(total / perPage)
    
    return {
      data: grouped,
      last_page: lastPage,
      total
    }
  } catch (error) {
    console.error('Error in getMessages:', error)
    throw error
  }
}

export async function deleteMessage(messageId: string, userId: string, mode: 'me' | 'all'): Promise<string | null> {
  try {
    const messageDoc = await db.collection('messages').doc(messageId).get()
    
    if (!messageDoc.exists) {
      return null
    }
    
    const message = messageDoc.data() as FirestoreMessage
    
    if (mode === 'all') {
      // Only sender can delete for all
      if (message.sender_id !== userId) {
        return null
      }
      
      await db.collection('messages').doc(messageId).delete()
      return message.conversation_id
    } else {
      // Soft delete for user
      await db
        .collection('message_deletions')
        .doc(message.rId)
        .doc(userId)
        .set({
          message_rId: message.rId,
          user_id: userId,
          created_at: new Date()
        })
      
      return message.conversation_id
    }
  } catch (error) {
    console.error('Error in deleteMessage:', error)
    return null
  }
}

export async function markDelivered(messageId: string): Promise<void> {
  try {
    await db
      .collection('messages')
      .doc(messageId)
      .update({
        delivered_at: new Date(),
        updated_at: new Date()
      })
  } catch (error) {
    console.error('Error in markDelivered:', error)
    throw error
  }
}

export async function markRead(conversationId: string, userId: string): Promise<number> {
  try {
    // Get all messages in conversation not from current user and not read
    const messagesQuery = db
      .collection('messages')
      .where('conversation_id', '==', conversationId)
      .where('sender_id', '!=', userId)
      .where('read_at', '==', null)
    
    const messagesSnapshot = await messagesQuery.get()
    
    let updatedCount = 0
    const batch = db.batch()
    
    for (const doc of messagesSnapshot.docs) {
      batch.update(doc.ref, {
        read_at: new Date(),
        updated_at: new Date()
      })
      updatedCount++
    }
    
    await batch.commit()
    return updatedCount
  } catch (error) {
    console.error('Error in markRead:', error)
    throw error
  }
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  try {
    const usersSnapshot = await db.collection('users').get()
    return usersSnapshot.docs.map(doc => doc.data() as FirestoreUser)
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

export async function getFileConversationId(filename: string): Promise<string | null> {
  try {
    const messagesQuery = db
      .collection('messages')
      .where('file_url', 'array-contains', filename)
    
    const messagesSnapshot = await messagesQuery.get()
    
    if (messagesSnapshot.empty) {
      return null
    }
    
    return messagesSnapshot.docs[0].data().conversation_id
  } catch (error) {
    console.error('Error in getFileConversationId:', error)
    return null
  }
}

// Helper functions
function generateUserId(): string {
  return crypto.randomUUID()
}

function generateConversationId(): string {
  return crypto.randomUUID()
}

function generateMessageId(): string {
  return Date.now().toString()
}

function generateAvatarUrl(username: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`
}
```

### 3.2 Firebase Authentication Integration

#### `server/utils/auth-firestore.ts`
```typescript
import { auth } from '../firebase.config'
import { adminAuth } from '../firebase.admin.config'
import { signToken, verifyToken } from './auth'

export async function createUserWithEmailAndPassword(email: string, password: string): Promise<any> {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: email.split('@')[0] // Use email prefix as username
    })
    
    return userRecord
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async signInWithEmailAndPassword(email: string, password: string): Promise<any> {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password)
    return userCredential.user
  } catch (error) {
    console.error('Error signing in user:', error)
    throw error
  }
}

export async function signOut(): Promise<void> {
  try {
    await auth.signOut()
  } catch (error) {
    console.error('Error signing out user:', error)
    throw error
  }
}

export async function getCurrentUser(): Promise<any> {
  return auth.currentUser
}

export async function onAuthStateChanged(callback: (user: any) => void): Promise<() => void> {
  return auth.onAuthStateChanged(callback)
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await auth.sendPasswordResetEmail(email)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

// JWT token functions for backward compatibility
export async function createFirebaseUserToken(userId: string): Promise<string> {
  try {
    const customToken = await adminAuth.createCustomToken(userId)
    return customToken
  } catch (error) {
    console.error('Error creating custom token:', error)
    throw error
  }
}

export async function verifyFirebaseToken(token: string): Promise<any> {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Error verifying Firebase token:', error)
    throw error
  }
}
```

#### `server/middleware/auth-firestore.ts`
```typescript
export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  try {
    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(token)
    
    // Add user context to the event
    event.context.userId = decodedToken.uid
    event.context.user = decodedToken
    
  } catch (error) {
    console.error('Authentication error:', error)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
```

### 3.3 File Storage Migration

#### `server/utils/storage-firestore.ts`
```typescript
import { storage } from '../firebase.config'
import { adminStorage } from '../firebase.admin.config'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp4', 'webm', 'mov',
  'mp3', 'wav', 'ogg', 'm4a',
  'pdf',
  'zip', 'rar'
])

const MAGIC_BYTES: Record<string, Buffer[]> = {
  '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  '.gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  '.webp': [Buffer.from('RIFF')],
  '.pdf': [Buffer.from('%PDF')],
  '.mp3': [Buffer.from('ID3'), Buffer.from([0xFF, 0xFB])],
  '.zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
}

function validateFileContent(buffer: Buffer, ext: string): boolean {
  const expected = MAGIC_BYTES[ext]
  if (!expected) return true
  return expected.some(magic => buffer.subarray(0, magic.length).equals(magic))
}

export async function uploadFileToStorage(file: Buffer, filename: string, userId: string): Promise<string> {
  try {
    const ext = path.extname(filename).toLowerCase().slice(1)
    
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`File type .${ext} is not allowed`)
    }
    
    if (file.length > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB')
    }
    
    if (!validateFileContent(file, ext)) {
      throw new Error('File content does not match extension')
    }
    
    const storageFilename = `${userId}/${Date.now()}_${filename}`
    const fileRef = storage.ref(storageFilename)
    
    await fileRef.put(file)
    const downloadURL = await fileRef.getDownloadURL()
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading file to storage:', error)
    throw error
  }
}

export async function deleteFileFromStorage(fileUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(fileUrl)
    const path = url.pathname.split('/o/')[1].split('?')[0]
    
    const fileRef = storage.ref(path)
    await fileRef.delete()
  } catch (error) {
    console.error('Error deleting file from storage:', error)
    throw error
  }
}

export async function moveLocalFilesToStorage(): Promise<void> {
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
    
    for (const filename of files) {
      const filePath = path.join(UPLOAD_DIR, filename)
      const fileBuffer = fs.readFileSync(filePath)
      
      // Extract user ID from filename if possible
      // This is a simplified approach - adjust based on your filename structure
      const userId = 'default' // You'll need to determine the user ID from filename
      
      try {
        const downloadURL = await uploadFileToStorage(fileBuffer, filename, userId)
        console.log(`Moved ${filename} to storage: ${downloadURL}`)
        
        // Delete local file after successful upload
        fs.unlinkSync(filePath)
      } catch (error) {
        console.error(`Failed to move ${filename}:`, error)
      }
    }
    
    console.log('File migration completed')
  } catch (error) {
    console.error('Error in file migration:', error)
    throw error
  }
}
```

### 3.4 Real-time Messaging System

#### `server/utils/realtime-firestore.ts`
```typescript
import { db } from '../firebase.config'
import { onSnapshot, doc, collection, query, where, orderBy } from 'firebase/firestore'

export interface RealtimeMessage {
  type: 'new-message' | 'message-updated' | 'user-typing' | 'user-online' | 'user-offline'
  message?: any
  conversation_id?: string
  userId?: string
  timestamp: Date
}

export class RealtimeManager {
  private static instance: RealtimeManager
  private subscriptions: Map<string, () => void> = new Map()
  
  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }
  
  subscribeToConversation(conversationId: string, userId: string, callback: (message: RealtimeMessage) => void): () => void {
    try {
      // Listen for new messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversation_id', '==', conversationId),
        orderBy('created_at', 'desc')
      )
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const message = change.doc.data()
            callback({
              type: 'new-message',
              message,
              conversation_id: conversationId,
              timestamp: new Date()
            })
          }
        })
      })
      
      this.subscriptions.set(`${userId}-${conversationId}`, unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to conversation:', error)
      throw error
    }
  }
  
  unsubscribeFromConversation(conversationId: string, userId: string): void {
    const key = `${userId}-${conversationId}`
    const unsubscribe = this.subscriptions.get(key)
    
    if (unsubscribe) {
      unsubscribe()
      this.subscriptions.delete(key)
    }
  }
  
  subscribeToUserPresence(userId: string, callback: (presence: RealtimeMessage) => void): () => void {
    try {
      // Listen for user online/offline status
      // This would typically use Firestore's real-time capabilities
      // or implement a custom presence system
      
      const unsubscribe = () => {
        // Cleanup logic
      }
      
      this.subscriptions.set(`presence-${userId}`, unsubscribe)
      return unsubscribe
    } catch (error) {
      console.error('Error subscribing to user presence:', error)
      throw error
    }
  }
  
  broadcastToConversation(conversationId: string, message: RealtimeMessage): void {
    // In a real implementation, this would send the message to all connected clients
    // For now, we'll just log it
    console.log(`Broadcasting to conversation ${conversationId}:`, message)
  }
  
  sendToUser(userId: string, message: RealtimeMessage): void {
    // In a real implementation, this would send the message to the specific user
    // For now, we'll just log it
    console.log(`Sending to user ${userId}:`, message)
  }
}

// Export singleton instance
export const realtimeManager = RealtimeManager.getInstance()
```

#### `server/api/messages.post-firestore.ts`
```typescript
import { createMessage, addParticipant, getConversationParticipantIds, realtimeManager } from '../utils/db-firestore'
import { uploadFileToStorage } from '../utils/storage-firestore'
import { validate, messageContentSchema, sanitizeString } from '../utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  const user = await realtimeManager.findUserById(userId)
  if (!user) throw createError({ statusCode: 401, message: 'User not found' })

  const body = await readMultipartFormData(event)
  if (!body) throw createError({ statusCode: 400, message: 'Invalid form data' })

  let content = ''
  let filePath = ''
  let fileExt = ''
  let fileSize = 0
  let customRId = ''
  let conversationId = ''
  let replyToRId = ''

  for (const part of body) {
    const name = part.name || ''
    if (name === 'content') content = part.data.toString()
    else if (name === 'conversation_id') conversationId = part.data.toString()
    else if (name === 'file_extension') fileExt = part.data.toString()
    else if (name === 'file_size') fileSize = parseInt(part.data.toString()) || 0
    else if (name === 'rId') customRId = part.data.toString()
    else if (name === 'reply_to_rId') replyToRId = part.data.toString()
    else if (name === 'file' && part.filename) {
      const ext = path.extname(part.filename).toLowerCase().slice(1)

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw createError({ statusCode: 400, message: `File type .${ext} is not allowed` })
      }

      if (part.data.length > 2 * 1024 * 1024) {
        throw createError({ statusCode: 400, message: 'File size must be less than 2MB' })
      }

      if (!validateFileContent(part.data, ext)) {
        throw createError({ statusCode: 400, message: 'File content does not match extension' })
      }

      // Upload to Firebase Storage
      const downloadURL = await uploadFileToStorage(part.data, part.filename, userId)
      filePath = downloadURL
    }
  }

  if (!conversationId) throw createError({ statusCode: 400, message: 'conversation_id is required' })

  addParticipant(conversationId, userId)

  const message = await createMessage(
    userId,
    conversationId,
    sanitizeString(content),
    filePath ? { url: filePath, ext: filePath.split('.').pop() || fileExt, size: fileSize } : undefined,
    customRId || undefined,
    replyToRId || undefined,
  )

  let replyTo
  if (replyToRId) {
    // Fetch reply message from Firestore
    const replyMessage = await db.collection('messages').doc(replyToRId).get()
    if (replyMessage.exists) {
      const data = replyMessage.data()
      replyTo = {
        rId: data.rId,
        sender: { id: data.sender_id, name: (await realtimeManager.findUserById(data.sender_id))?.username || '' },
        content: data.content
      }
    }
  }

  const formatted = {
    rId: message.rId,
    id: message.id,
    conversation_id: conversationId,
    sender: {
      id: userId,
      name: user.username,
      image: user.avatar || '',
    },
    content: message.content,
    file: message.file_url,
    file_extension: message.file_extension || '',
    file_size: message.file_size || undefined,
    reply_to: replyTo,
    read_at: message.read_at,
    created_at: message.created_at.toISOString(),
    created_at_time: message.created_at.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
    delivered_at: null as string | null,
  }

  // Broadcast to conversation participants
  realtimeManager.broadcastToConversation(conversationId, {
    type: 'new-message',
    message: formatted,
    conversation_id: conversationId,
    timestamp: new Date()
  })

  // Send to individual participants
  const participantIds = await getConversationParticipantIds(conversationId)
  let delivered = false
  
  for (const pid of participantIds) {
    if (pid !== userId) {
      realtimeManager.sendToUser(pid, {
        type: 'new-message',
        message: formatted,
        conversation_id: conversationId,
        timestamp: new Date()
      })
      
      if (!delivered) {
        await markDelivered(message.id)
        delivered = true
      }
    }
  }

  if (delivered) {
    formatted.delivered_at = new Date().toISOString()
    realtimeManager.sendToUser(userId, {
      type: 'delivery-update',
      message_id: message.rId,
      conversation_id: conversationId,
      timestamp: new Date()
    })
  }

  setResponseStatus(event, 201)
  return { message: formatted }
})
```

## Testing Checklist

### 3.1 Database Layer Replacement
- [ ] All database operations work with Firestore
- [ ] Performance is comparable or better than SQLite
- [ ] Data integrity is maintained
- [ ] Error handling is implemented

### 3.2 Firebase Authentication Integration
- [ ] Authentication flow works correctly
- [ ] JWT tokens are properly handled
- [ ] User management functions work
- [ ] Session management is implemented

### 3.3 File Storage Migration
- [ ] File uploads work with Firebase Storage
- [ ] File downloads work correctly
- [ ] File migration from local to cloud is complete
- [ ] File validation is working

### 3.4 Real-time Messaging System
- [ ] Real-time updates work correctly
- [ ] Message delivery is reliable
- [ ] Presence tracking works
- [ ] Performance is acceptable

## Potential Issues and Solutions

### Issue: Firestore query performance
**Solution**: Implement proper indexing and query optimization

### Issue: Real-time listener performance
**Solution**: Use efficient query patterns and implement pagination

### Issue: File upload reliability
**Solution**: Implement retry logic and progress tracking

## Next Steps
After completing Phase 3, proceed to Phase 4: Frontend Integration