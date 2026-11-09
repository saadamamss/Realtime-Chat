import { ref, onUnmounted } from 'vue'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc, collection, query, where, orderBy, limit,
  onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  writeBatch, serverTimestamp
} from 'firebase/firestore'
import { useFirebase } from './useFirebase'

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

export const useRealtimeChat = () => {
  const { user } = useFirebase()

  const messages = ref<Record<string, any[]>>({})
  const conversations = ref<any[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  let messageUnsubscribe: (() => void) | null = null
  let conversationUnsubscribe: (() => void) | null = null

  const loadConversations = async (userId: string) => {
    try {
      loading.value = true
      error.value = null

      const participantsQuery = query(
        collection(db, 'participants', userId, 'participants'),
        where('hidden', '==', false),
        where('deleted_at', '==', null),
        orderBy('updated_at', 'desc'),
        limit(50)
      )

      conversationUnsubscribe = onSnapshot(participantsQuery, async (snapshot) => {
        const conversationIds = snapshot.docs.map(d => d.data().conversation_id)

        if (conversationIds.length === 0) {
          conversations.value = []
          loading.value = false
          return
        }

        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('__name__', 'in', conversationIds.slice(0, 30)) // Firestore 'in' limit is 30
        )

        const convSnapshot = await getDocs(conversationsQuery)
        conversations.value = convSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        loading.value = false
      })
    } catch (err: any) {
      error.value = err.message
      loading.value = false
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      loading.value = true
      error.value = null

      // Unsubscribe from previous conversation
      if (messageUnsubscribe) {
        messageUnsubscribe()
        messageUnsubscribe = null
      }

      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversation_id', '==', conversationId),
        orderBy('created_at', 'desc'),
        limit(50)
      )

      messageUnsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        let msgData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

        // Filter out soft-deleted messages for this user
        const filtered: any[] = []
        for (const message of msgData) {
          const deletionRef = doc(db, 'message_deletions', message.rId, 'deletions', user.value?.uid || '')
          const deletionDoc = await getDoc(deletionRef)
          if (!deletionDoc.exists()) {
            filtered.push(message)
          }
        }

        // Group messages by date
        const grouped: Record<string, any[]> = {}
        for (const message of filtered.reverse()) {
          const date = message.created_at?.toDate().toISOString().split('T')[0]
          if (!grouped[date]) grouped[date] = []
          grouped[date].push(message)
        }

        messages.value = grouped
        loading.value = false
      })

  const sendMessage = async (conversationId: string, content: string, file?: { url: string; ext: string; size: number }) => {
    try {
      const userId = user.value?.uid
      if (!userId) throw new Error('User not authenticated')

      await addDoc(collection(db, 'messages'), {
        rId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        sender_id: userId,
        content,
        file_url: file?.url || '',
        file_extension: file?.ext || '',
        file_size: file?.size || 0,
        reply_to_rId: null,
        delivered_at: null,
        read_at: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  const deleteMessageForMe = async (rId: string) => {
    try {
      const userId = user.value?.uid
      if (!userId) throw new Error('User not authenticated')

      await setDoc(doc(db, 'message_deletions', rId, 'deletions', userId), {
        user_id: userId,
        created_at: serverTimestamp()
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  const deleteMessageForAll = async (messageId: string, senderId: string) => {
    try {
      const userId = user.value?.uid
      if (!userId) throw new Error('User not authenticated')
      if (senderId !== userId) throw new Error('Only the sender can delete for everyone')

      await deleteDoc(doc(db, 'messages', messageId))
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      const userId = user.value?.uid
      if (!userId) throw new Error('User not authenticated')

      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversation_id', '==', conversationId),
        where('sender_id', '!=', userId),
        where('read_at', '==', null)
      )
      const batchArgs = await getDocs(messagesQuery)

      if (batchArgs.empty) return 0

      const batch = writeBatch(db)
      batchArgs.forEach((d) => {
        batch.update(d.ref, {
          read_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })
      })

      await batch.commit()
      return batchArgs.size
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Cleanup listeners when component unmounts
  onUnmounted(() => {
    if (messageUnsubscribe) messageUnsubscribe()
    if (conversationUnsubscribe) conversationUnsubscribe()
  })

  return {
    messages,
    conversations,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    deleteMessageForMe,
    deleteMessageForAll,
    markAsRead
  }
}
