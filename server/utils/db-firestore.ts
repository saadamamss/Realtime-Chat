import { getFirestore, doc, collection, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
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
      
      const userData = userDoc.data()
      return { ...userData, id: userDoc.id }
    } else {
      // Create new user
      const userId = crypto.randomUUID()
      const newUser = {
        id: userId,
        username,
        phone_number: phoneNumber,
        avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=2563eb&textColor=ffffff`,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      
      await setDoc(doc(db, 'users', userId), newUser)
      return newUser
    }
  } catch (error) {
    console.error('Error in findOrCreateUser:', error)
    throw error
  }
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
    return { ...userDoc.data(), id: userDoc.id }
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
    
    return { ...userDoc.data(), id: userDoc.id }
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
    return { ...newUser, password_hash: undefined } // Don't return password hash
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
    const contactsQuery = query(
      collection(db, 'contacts', userId, 'contacts'),
      orderBy('created_at', 'desc')
    )
    
    const contactsSnapshot = await getDocs(contactsQuery)
    
    const contacts = []
    for (const doc of contactsSnapshot.docs) {
      const contactData = doc.data()
      const user = await findUserById(contactData.contact_id)
      if (user) {
        contacts.push({
          id: user.id,
          name: user.username,
          phone_number: user.phone_number,
          image: user.avatar
        })
      }
    }
    
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
      
      return { ...convData, id: convDoc.id }
    } else {
      // Create new conversation
      const conversationId = crypto.randomUUID()
      const newConv = {
        id: conversationId,
        name,
        created_by: createdBy || user1Id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      
      await setDoc(doc(db, 'conversations', conversationId), newConv)
      
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

export async function addParticipant(conversationId: string, userId: string) {
  try {
    const participantRef = doc(db, 'participants', conversationId, 'participants', userId)
    
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
    const participantsQuery = query(
      collection(db, 'participants', userId, 'participants'),
      where('hidden', '==', false),
      where('deleted_at', '==', null),
      orderBy('updated_at', 'desc'),
      limit(50)
    )
    
    const participantsSnapshot = await getDocs(participantsQuery)
    
    const conversationIds = participantsSnapshot.docs.map(doc => doc.data().conversation_id)
    
    if (conversationIds.length === 0) {
      return []
    }
    
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('__name__', 'in', conversationIds)
    )
    
    const conversationsSnapshot = await getDocs(conversationsQuery)
    
    return conversationsSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }))
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
    return newMessage
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
      orderBy('created_at', 'desc'),
      limit(perPage)
    )
    
    const messagesSnapshot = await getDocs(messagesQuery)
    
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    // Check for message deletions
    const deletedMessageIds = []
    for (const message of messages) {
      const deletionDoc = await getDoc(doc(db, 'message_deletions', message.rId, 'deletions', userId))
      if (deletionDoc.exists()) {
        deletedMessageIds.push(message.id)
      }
    }
    
    // Filter out deleted messages
    const filteredMessages = messages.filter(msg => !deletedMessageIds.includes(msg.id))
    
    // Group by date
    const grouped: Record<string, any[]> = {}
    for (const message of filteredMessages.reverse()) {
      const date = message.created_at?.toDate().toISOString().split('T')[0]
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
    // Get all messages in conversation not from current user and not read
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversation_id', '==', conversationId),
      where('sender_id', '!=', userId),
      where('read_at', '==', null)
    )
    
    const messagesSnapshot = await getDocs(messagesQuery)
    
    const batch = []
    messagesSnapshot.forEach((doc) => {
      batch.push(updateDoc(doc.ref, {
        read_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }))
    })
    
    await Promise.all(batch)
    return messagesSnapshot.size
  } catch (error) {
    console.error('Error in markRead:', error)
    throw error
  }
}

export async function getAllUsers() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'))
    return usersSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }))
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    throw error
  }
}

export async function getFileConversationId(filename: string) {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('file_url', 'array-contains', filename)
    )
    
    const messagesSnapshot = await getDocs(messagesQuery)
    
    if (messagesSnapshot.empty) {
      return null
    }
    
    return messagesSnapshot.docs[0].data().conversation_id
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