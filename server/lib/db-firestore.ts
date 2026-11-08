import { getFirestore, doc, collection, collectionGroup, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, documentId, serverTimestamp } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Normalizes a Firestore timestamp (Timestamp | {seconds} | ISO string | Date)
// into an ISO string so responses match the SQLite API shape.
export function tsToIso(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  return null
}

// Normalizes a stored message document into the same shape db.ts returns
// (created_at as ISO string, `file` prefixed with the files API route, etc.)
function normalizeMessage(data: any): any {
  const createdAtIso = tsToIso(data.created_at) ?? new Date().toISOString()
  const out = {
    ...data,
    sender: data.sender ?? {
      id: data.sender_id,
      name: '',
      image: '',
    },
    file: data.file ?? (data.file_url ? `/api/files${data.file_url}` : ''),
    file_extension: data.file_extension ?? '',
    file_size: data.file_size || undefined,
    reply_to: data.reply_to,
    delivered_at: tsToIso(data.delivered_at),
    read_at: tsToIso(data.read_at),
    created_at: createdAtIso,
    created_at_time: new Date(createdAtIso).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    status: 'sent' as const,
  }
  delete out.updated_at
  return out
}

// Fetches a user map for sender enrichment (replaces SQLite SQL JOINs).
async function fetchUsersMap(userIds: string[]): Promise<Map<string, { username: string; avatar: string }>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const pairs = await Promise.all(unique.map(async (id) => {
    const snap = await getDoc(doc(db, 'users', id))
    const data = snap.data()
    return [id, { username: data?.username ?? '', avatar: data?.avatar ?? '' }] as const
  }))
  return new Map(pairs)
}

// Internal exports used by server/lib/db-facade.ts
export { db as fbDb, app as firebaseApp }

// Normalizes a conversation document to the SQLite response shape.
function normalizeConversation(data: any): any {
  return {
    id: data.id,
    name: data.name,
    created_by: data.created_by,
    created_at: tsToIso(data.created_at) ?? new Date().toISOString(),
  }
}

// User operations
export async function findOrCreateUser(username: string, phoneNumber: string) {
  try {
    // Check if user exists by phone number
    const usersQuery = query(
      collection(db, 'users'),
      where('phone_number', '==', phoneNumber)
    )
    
    const userSnapshot = await getDocs(usersQuery)
    
    if (!userSnapshot.empty) {
      // User exists, update username and return
      const userDoc = userSnapshot.docs[0]
      await updateDoc(userDoc.ref, {
        username,
        updated_at: serverTimestamp()
      })
      
      return normalizeUser(userDoc.data(), userDoc.id)
    } else {
      // Create new user
      const userId = crypto.randomUUID()
      const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`
      await setDoc(doc(db, 'users', userId), {
        id: userId,
        username,
        phone_number: phoneNumber,
        avatar,
        password_hash: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      
      return {
        id: userId,
        username,
        phone_number: phoneNumber,
        avatar,
        created_at: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('Error in findOrCreateUser:', error)
    throw error
  }
}

// Normalizes a user document like db.ts does:
// - timestamps become ISO strings
// - `updated_at` and `password_hash` are never exposed externally
//   (password_hash is only legitimately visible to findUserByPhoneNumber
//    for the login flow, matching the SQLite implementation).
function normalizeUser(data: any, docId: string, opts: { internal?: boolean } = {}): any {
  const out: any = {
    id: docId,
    username: data.username,
    phone_number: data.phone_number ?? '',
    avatar: data.avatar ?? '',
    created_at: tsToIso(data.created_at) ?? new Date().toISOString(),
  }
  if (opts.internal) out.password_hash = data.password_hash ?? null
  return out
}

export async function findUserByPhoneNumber(phoneNumber: string) {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('phone_number', '==', phoneNumber)
    )
    
    const userSnapshot = await getDocs(usersQuery)
    
    if (userSnapshot.empty) {
      return null
    }
    
    const userDoc = userSnapshot.docs[0]
    // internal:true keeps password_hash for the login flow (same as SQLite SELECT *)
    return normalizeUser(userDoc.data(), userDoc.id, { internal: true })
  } catch (error) {
    console.error('Error in findUserByPhoneNumber:', error)
    throw error
  }
}

export async function findUserById(id: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', id))
    
    if (!userDoc.exists()) {
      return null
    }
    
    return normalizeUser(userDoc.data(), userDoc.id)
  } catch (error) {
    console.error('Error in findUserById:', error)
    throw error
  }
}

export async function createUser(username: string, phoneNumber: string, passwordHash: string) {
  try {
    const userId = crypto.randomUUID()
    const newUser = {
      id: userId,
      username,
      phone_number: phoneNumber,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`,
      password_hash: passwordHash,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }
    
    await setDoc(doc(db, 'users', userId), newUser)
    // Return the public shape only — password_hash must never leak into a
    // response body (mirrors the SQLite createUser SELECT).
    return {
      id: userId,
      username,
      phone_number: phoneNumber,
      avatar: newUser.avatar,
    }
  } catch (error) {
    console.error('Error in createUser:', error)
    throw error
  }
}

// Contact operations
export async function addContact(userId: string, phoneNumber: string) {
  try {
    // Find the contact user
    const contactUser = await findUserByPhoneNumber(phoneNumber)
    if (!contactUser || contactUser.id === userId) {
      return null
    }
    
    // Add contact
    const contactRef = doc(db, 'contacts', userId, 'contacts', contactUser.id)
    await setDoc(contactRef, {
      contact_id: contactUser.id,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
    
    return {
      id: contactUser.id,
      name: contactUser.username,
      phone_number: contactUser.phone_number,
      image: contactUser.avatar
    }
  } catch (error) {
    console.error('Error in addContact:', error)
    throw error
  }
}

export async function removeContact(userId: string, contactId: string) {
  try {
    await deleteDoc(doc(db, 'contacts', userId, 'contacts', contactId))
    return true
  } catch (error) {
    console.error('Error in removeContact:', error)
    return false
  }
}

export async function getContacts(userId: string) {
  try {
    // No orderBy — created_at mixes ISO strings (migration) and Timestamps
    // (new writes). Sort in memory by normalized time instead.
    const contactsQuery = query(
      collection(db, 'contacts', userId, 'contacts')
    )
    
    const contactsSnapshot = await getDocs(contactsQuery)
    
    const contacts = []
    for (const contactDoc of contactsSnapshot.docs) {
      const contactData = contactDoc.data()
      const user = await findUserById(contactData.contact_id)
      if (user) {
        contacts.push({
          id: user.id,
          name: user.username,
          phone_number: user.phone_number,
          image: user.avatar,
          created_at: tsToIso(contactData.created_at) ?? null,
        })
      }
    }
    
    contacts.sort((a: any, b: any) =>
      (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    contacts.forEach((c: any) => delete c.created_at)
    
    return contacts
  } catch (error) {
    console.error('Error in getContacts:', error)
    throw error
  }
}

// Conversation operations
export async function getOrCreateDMConversation(user1Id: string, user2Id: string, createdBy?: string) {
  try {
    const ids = [user1Id, user2Id].sort()
    const name = `dm:${ids[0]}:${ids[1]}`
    
    // Check if conversation exists
    const convQuery = query(
      collection(db, 'conversations'),
      where('name', '==', name)
    )
    
    const convSnapshot = await getDocs(convQuery)
    
    if (!convSnapshot.empty) {
      // Conversation exists, ensure both users are participants
      const convDoc = convSnapshot.docs[0]
      const convData = convDoc.data()
      
      await addParticipant(convData.id, user1Id)
      await addParticipant(convData.id, user2Id)
      
      // Read back so serverTimestamp() sentinels resolve to real values
      const fresh = await getDoc(convDoc.ref)
      return normalizeConversation({ ...fresh.data(), id: fresh.id })
    } else {
      // Create new conversation
      const conversationId = crypto.randomUUID()
      await setDoc(doc(db, 'conversations', conversationId), {
        id: conversationId,
        name,
        created_by: createdBy || user1Id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      
      // Add participants
      await addParticipant(conversationId, user1Id)
      await addParticipant(conversationId, user2Id)
      
      // Read back the written doc (normalizes timestamps)
      const written = await getDoc(doc(db, 'conversations', conversationId))
      return normalizeConversation({ ...written.data(), id: written.id })
    }
  } catch (error) {
    console.error('Error in getOrCreateDMConversation:', error)
    throw error
  }
}

export async function addParticipant(conversationId: string, userId: string) {
  try {
    const participantRef = doc(db, 'participants', conversationId, 'participants', userId)
    
    // Mirror every membership into a TOP-LEVEL 'memberships' collection.
    // Top-level collections get automatic single-field indexes, so
    // getConversations can query them without any custom composite index
    // (collection-group queries would require manual index exemptions).
    const membershipData = {
      user_id: userId,
      conversation_id: conversationId,
      hidden: false,
      deleted_at: null,
      updated_at: serverTimestamp()
    }
    
    // Check if participant exists
    const participantDoc = await getDoc(participantRef)
    
    if (participantDoc.exists()) {
      // Update existing participant
      await updateDoc(participantRef, {
        hidden: false,
        deleted_at: null,
        updated_at: serverTimestamp()
      })
    } else {
      // Create new participant
      await setDoc(participantRef, {
        user_id: userId,
        conversation_id: conversationId,
        hidden: false,
        deleted_at: null,
        joined_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
    }
    
    await setDoc(
      doc(db, 'memberships', `${conversationId}_${userId}`),
      membershipData
    )
  } catch (error) {
    console.error('Error in addParticipant:', error)
    throw error
  }
}

export async function isParticipant(conversationId: string, userId: string) {
  try {
    const participantDoc = await getDoc(doc(db, 'participants', conversationId, 'participants', userId))
    return participantDoc.exists() && !participantDoc.data()?.deleted_at
  } catch (error) {
    console.error('Error in isParticipant:', error)
    return false
  }
}

export async function wipeConversation(conversationId: string, userId: string) {
  try {
    await updateDoc(doc(db, 'participants', conversationId, 'participants', userId), {
      deleted_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
    // Keep the top-level membership mirror in sync
    await updateDoc(doc(db, 'memberships', `${conversationId}_${userId}`), {
      deleted_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  } catch (error) {
    console.error('Error in wipeConversation:', error)
    throw error
  }
}

export async function deleteConversation(conversationId: string, userId: string) {
  try {
    await updateDoc(doc(db, 'participants', conversationId, 'participants', userId), {
      hidden: true,
      deleted_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
    // Keep the top-level membership mirror in sync
    await updateDoc(doc(db, 'memberships', `${conversationId}_${userId}`), {
      hidden: true,
      deleted_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  } catch (error) {
    console.error('Error in deleteConversation:', error)
    throw error
  }
}

export async function getConversationParticipantIds(conversationId: string) {
  try {
    const participantsQuery = query(
      collection(db, 'participants', conversationId, 'participants'),
      where('hidden', '==', false),
      where('deleted_at', '==', null)
    )
    
    const participantsSnapshot = await getDocs(participantsQuery)
    
    return participantsSnapshot.docs.map(doc => doc.data().user_id)
  } catch (error) {
    console.error('Error in getConversationParticipantIds:', error)
    throw error
  }
}

export async function getConversations(userId: string) {
  try {
    // Query the TOP-LEVEL 'memberships' mirror collection — top-level
    // collections have automatic single-field indexes, so this predicate-only
    // query works without any custom composite index. Status fields are
    // filtered in memory (mirrors SQLite: cp.hidden = 0).
    const membershipsQuery = query(
      collection(db, 'memberships'),
      where('user_id', '==', userId)
    )
    
    const membershipsSnapshot = await getDocs(membershipsQuery)
    
    const myMemberships = membershipsSnapshot.docs
      .map(d => d.data())
      .filter(m => m.hidden !== true && m.conversation_id)
    
    const conversationIds = myMemberships.map(m => m.conversation_id as string)
    
    if (conversationIds.length === 0) {
      return []
    }
    
    // Fetch conversation docs. Firestore 'in' supports at most 30 values.
    const uniqueIds = [...new Set(conversationIds)]
    const convSnaps = []
    for (let i = 0; i < uniqueIds.length; i += 30) {
      const chunk = uniqueIds.slice(i, i + 30)
      const convQuery = query(
        collection(db, 'conversations'),
        where(documentId(), 'in', chunk)
      )
      convSnaps.push(...(await getDocs(convQuery)).docs)
    }
    
    const conversations = convSnaps.map(d => ({ ...d.data(), id: d.id }))
    
    // For each conversation compute last_message / unread_count / other user
    // (in memory — the SQLite version did this with correlated subqueries).
    const result = await Promise.all(conversations.map(async (conv: any) => {
      const convId = conv.id
      
      // All messages in this conversation (equality-only query)
      const msgsSnapshot = await getDocs(query(
        collection(db, 'messages'),
        where('conversation_id', '==', convId)
      ))
      const msgs = msgsSnapshot.docs.map(d => d.data())
      
      let lastMessage: string | null = null
      let lastMessageAt: string | null = null
      let lastTime = -1
      let unreadCount = 0
      for (const m of msgs) {
        const t = tsToIso(m.created_at) ?? ''
        const time = t ? new Date(t).getTime() : 0
        if (time > lastTime) {
          lastTime = time
          lastMessage = m.content || null
          lastMessageAt = t || null
        }
        if (m.sender_id !== userId && !tsToIso(m.read_at)) {
          unreadCount++
        }
      }
      
      // Other participant: hidden not true, user_id != mine (mirrors the SQLite join).
      // Read from the memberships mirror — no subcollection listing needed.
      const otherSnapshot = await getDocs(query(
        collection(db, 'memberships'),
        where('conversation_id', '==', convId)
      ))
      const otherId = otherSnapshot.docs
        .map(d => d.data())
        .find(p => p.user_id !== userId && p.hidden !== true)?.user_id as string | undefined
      
      let otherParticipant = null
      if (otherId) {
        const userDoc = await getDoc(doc(db, 'users', otherId))
        if (userDoc.exists()) {
          const u = userDoc.data()
          otherParticipant = {
            id: otherId,
            name: u.username,
            phone_number: u.phone_number ?? '',
            image: u.avatar ?? '',
          }
        }
      }
      
      return {
        id: convId,
        name: conv.name ?? '',
        created_at: tsToIso(conv.created_at) ?? null,
        last_message: lastMessage,
        last_message_at: lastMessageAt,
        unread_count: unreadCount,
        other_participant: otherParticipant,
      }
    }))
    
    // EXISTS-messages OR created_by filter (mirrors SQLite HAVING clause)
    const visible = result.filter(c =>
      c.last_message_at !== null || convSnaps.find(d => d.id === c.id)?.data()?.created_by === userId
    )
    
    // ORDER BY last_message_at DESC
    visible.sort((a: any, b: any) =>
      (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
    
    return visible
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
) {
  try {
    const messageId = crypto.randomUUID()
    const rId = customRId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const newMessage = {
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
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }
    
    await setDoc(doc(db, 'messages', messageId), newMessage)

    // Read back so serverTimestamp() resolves to a real value (matches the
    // SQLite implementation, which re-selected the inserted row).
    const written = await getDoc(doc(db, 'messages', messageId))
    return normalizeMessage({ ...written.data(), id: written.id })
  } catch (error) {
    console.error('Error in createMessage:', error)
    throw error
  }
}

export async function getMessages(conversationId: string, userId: string, page: number = 1, perPage: number = 15) {
  try {
    // Check if user is a participant
    const isParticipantDoc = await getDoc(doc(db, 'participants', conversationId, 'participants', userId))
    
    if (!isParticipantDoc.exists() || isParticipantDoc.data()?.deleted_at) {
      throw new Error('User is not a participant in this conversation')
    }
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversation_id', '==', conversationId),
      limit(500)
    )
    
    const messagesSnapshot = await getDocs(messagesQuery)
    
    const allMessages = messagesSnapshot.docs.map(doc =>
      normalizeMessage({ ...doc.data(), id: doc.id })
    )

    // createdAt may be an ISO string (migration) or a Timestamp (new writes)
    allMessages.sort((a, b) => {
      const ta = new Date(tsToIso(a.created_at) ?? 0).getTime()
      const tb = new Date(tsToIso(b.created_at) ?? 0).getTime()
      return tb - ta // newest first, then reversed below for display
    })

    // Soft-deleted messages for this user are filtered out
    const visible = []
    for (const message of allMessages) {
      if (message.rId) {
        const deletionDoc = await getDoc(doc(db, 'message_deletions', message.rId, 'deletions', userId))
        if (deletionDoc.exists()) continue
      }
      visible.push(message)
    }

    // Sender enrichment + paging (mirrors the SQLite LIMIT/OFFSET + JOIN)
    const total = visible.length
    const lastPage = Math.max(1, Math.ceil(total / perPage))
    const offset = (page - 1) * perPage
    const pageMessages = visible.slice(offset, offset + perPage)

    const usersMap = await fetchUsersMap(pageMessages.map(m => m.sender_id))
    const enriched = pageMessages.map(m => ({
      ...m,
      sender: {
        id: m.sender_id,
        name: usersMap.get(m.sender_id)?.username ?? '',
        image: usersMap.get(m.sender_id)?.avatar ?? '',
      },
    }))

    // Group by date
    const grouped: Record<string, any[]> = {}
    for (const message of enriched.reverse()) {
      const date = (tsToIso(message.created_at) ?? '').split('T')[0]
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(message)
    }
    
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

export async function deleteMessage(messageId: string, userId: string, mode: 'me' | 'all') {
  try {
    const messageDoc = await getDoc(doc(db, 'messages', messageId))
    
    if (!messageDoc.exists()) {
      return null
    }
    
    const message = messageDoc.data()
    
    if (mode === 'all') {
      // Only sender can delete for all
      if (message.sender_id !== userId) {
        return null
      }
      
      await deleteDoc(doc(db, 'messages', messageId))
      return message.conversation_id
    } else {
      // Soft delete for user
      await setDoc(doc(db, 'message_deletions', message.rId, 'deletions', userId), {
        message_rId: message.rId,
        user_id: userId,
        created_at: serverTimestamp()
      })
      
      return message.conversation_id
    }
  } catch (error) {
    console.error('Error in deleteMessage:', error)
    return null
  }
}

export async function markDelivered(messageId: string) {
  try {
    await updateDoc(doc(db, 'messages', messageId), {
      delivered_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  } catch (error) {
    console.error('Error in markDelivered:', error)
    throw error
  }
}

export async function markRead(conversationId: string, userId: string) {
  try {
    // Equality-only query (no composite index required); filter in memory
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversation_id', '==', conversationId)
    )
    
    const messagesSnapshot = await getDocs(messagesQuery)
    
    const targets = messagesSnapshot.docs.filter(d => {
      const data = d.data()
      return data.sender_id !== userId && !tsToIso(data.read_at)
    })
    
    const batch = []
    targets.forEach((doc) => {
      batch.push(updateDoc(doc.ref, {
        read_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }))
    })
    
    await Promise.all(batch)
    return targets.length
  } catch (error) {
    console.error('Error in markRead:', error)
    throw error
  }
}

export async function getAllUsers() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'))
    // Shape matches SQLite: { id, name, phone_number, image } — no password_hash
    return usersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.username,
        phone_number: data.phone_number ?? '',
        image: data.avatar ?? '',
      }
    })
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

export async function getFileConversationId(filename: string) {
  try {
    // Firestore cannot search by suffix-match, so scan file messages in
    // memory (dataset is small). Replace with a filename index document
    // before scaling up.
    const fileQuery = query(
      collection(db, 'messages'),
      where('file_url', '!=', ''),
      limit(1000)
    )
    
    const fileSnapshot = await getDocs(fileQuery)
    
    for (const docData of fileSnapshot.docs) {
      const fileUrl: string = docData.data().file_url || ''
      if (fileUrl.endsWith(filename) || filename.endsWith(fileUrl)) {
        return docData.data().conversation_id
      }
    }
    
    return null
  } catch (error) {
    console.error('Error in getFileConversationId:', error)
    return null
  }
}

// Real-time listeners
export function subscribeToMessages(conversationId: string, callback: (messages: any[]) => void) {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('conversation_id', '==', conversationId),
    orderBy('created_at', 'desc'),
    limit(50)
  )
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(messages)
  })
}

export function subscribeToConversations(userId: string, callback: (conversations: any[]) => void) {
  const participantsQuery = query(
    collection(db, 'participants', userId, 'participants'),
    where('hidden', '==', false),
    where('deleted_at', '==', null),
    orderBy('updated_at', 'desc')
  )
  
  return onSnapshot(participantsQuery, (snapshot) => {
    const conversationIds = snapshot.docs.map(doc => doc.data().conversation_id)
    
    if (conversationIds.length === 0) {
      callback([])
      return
    }
    
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('__name__', 'in', conversationIds)
    )
    
    const unsubscribe = onSnapshot(conversationsQuery, (convSnapshot) => {
      const conversations = convSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(conversations)
    })
    
    return unsubscribe
  })
}