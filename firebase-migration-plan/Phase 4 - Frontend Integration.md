# Phase 4: Frontend Integration

## Overview
This phase focuses on updating the frontend to use Firebase services, implementing real-time listeners, updating the authentication flow, and ensuring a smooth user experience during the migration.

## Tasks

### 4.1 Firebase SDK Integration
- [ ] Install Firebase SDK in frontend
- [ ] Configure Firebase services in Nuxt.js
- [ ] Update environment variables for frontend
- [ ] Test Firebase connectivity

### 4.2 Authentication Flow Update
- [ ] Replace custom authentication with Firebase Auth
- [ ] Update login/register components
- [ ] Implement authentication state persistence
- [ ] Test authentication flow

### 4.3 Real-time Listeners Implementation
- [ ] Implement Firestore real-time listeners for messages
- [ ] Add conversation updates listeners
- [ ] Implement typing indicators
- [ ] Test real-time updates

### 4.4 File Upload Integration (Cloudinary)
- [ ] Install Cloudinary SDK in frontend
- [ ] Update file upload component to use Cloudinary
- [ ] Implement file preview functionality
- [ ] Test file upload with progress indication
- [ ] Handle Cloudinary error states

### 4.4 UI/UX Updates
- [ ] Update UI components to work with Firebase data
- [ ] Implement loading states and error handling
- [ ] Add offline support
- [ ] Test user experience

## Implementation Files

### 4.1 Firebase SDK Integration

#### `composables/useFirebase.ts`
```typescript
import { auth, db, storage } from '~/firebase.config'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { doc, onSnapshot, collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export const useFirebase = () => {
  const user = ref(null)
  const loading = ref(true)
  
  // Authentication
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }
  
  const register = async (email: string, password: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      // Update user profile with username
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        username,
        updated_at: new Date()
      })
      return userCredential
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }
  
  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }
  
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }
  
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }
  
  // Watch auth state
  onAuthStateChanged(auth, (authUser) => {
    user.value = authUser
    loading.value = false
  })
  
  // Firestore operations
  const subscribeToMessages = (conversationId: string, callback: (messages: any[]) => void) => {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversation_id', '==', conversationId),
      orderBy('created_at', 'desc')
    )
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(messages)
    })
  }
  
  const subscribeToConversations = (userId: string, callback: (conversations: any[]) => void) => {
    const participantsQuery = query(
      collection(db, 'participants'),
      where('user_id', '==', userId),
      where('hidden', '==', false),
      where('deleted_at', '==', null)
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
  
  // File operations
  const uploadFile = async (file: File, userId: string) => {
    try {
      const fileRef = ref(storage, `${userId}/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      return downloadURL
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }
  
  return {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle,
    subscribeToMessages,
    subscribeToConversations,
    uploadFile
  }
}
```

#### `plugins/firebase.client.ts`
```typescript
import { defineNuxtPlugin } from '#app'
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export default defineNuxtPlugin((nuxtApp) => {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  }

  // Initialize Firebase
  const app = initializeApp(firebaseConfig)
  
  // Initialize services
  const auth = getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)
  
  // Provide to app
  nuxtApp.provide('firebase', { app, auth, db, storage })
})
```

### 4.2 Authentication Flow Update

#### `components/auth/AuthFirebase.vue`
```vue
<template>
  <div class="auth-container">
    <div class="auth-form">
      <h2>{{ isLogin ? 'Login' : 'Register' }}</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            v-model="form.email"
            required
            :disabled="loading"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            v-model="form.password"
            required
            :disabled="loading"
          />
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label for="username">Username</label>
          <input
            type="text"
            id="username"
            v-model="form.username"
            required
            :disabled="loading"
          />
        </div>
        
        <div class="form-group">
          <button type="submit" :disabled="loading">
            {{ loading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
          </button>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="toggleMode">
            {{ isLogin ? 'Need to register?' : 'Already have an account?' }}
          </button>
          
          <button 
            type="button" 
            @click="loginWithGoogle" 
            :disabled="loading"
            class="google-btn"
          >
            <img src="~/assets/google-logo.png" alt="Google" />
            Continue with Google
          </button>
          
          <button 
            type="button" 
            @click="showResetPassword = true"
            class="link-btn"
          >
            Forgot password?
          </button>
        </div>
      </form>
    </div>
    
    <div v-if="showResetPassword" class="reset-password">
      <h3>Reset Password</h3>
      <form @submit.prevent="handleResetPassword">
        <div class="form-group">
          <label for="reset-email">Email</label>
          <input
            type="email"
            id="reset-email"
            v-model="resetEmail"
            required
            :disabled="loading"
          />
        </div>
        
        <div class="form-group">
          <button type="submit" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Reset Email' }}
          </button>
          <button type="button" @click="showResetPassword = false" class="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
    
    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useFirebase } from '~/composables/useFirebase'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login, register, loginWithGoogle, resetPassword, loading } = useFirebase()

const isLogin = ref(true)
const showResetPassword = ref(false)
const error = ref('')
const resetEmail = ref('')

const form = reactive({
  email: '',
  password: '',
  username: ''
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  form.email = ''
  form.password = ''
  form.username = ''
}

const handleSubmit = async () => {
  try {
    error.value = ''
    
    if (isLogin.value) {
      await login(form.email, form.password)
      router.push('/chat')
    } else {
      await register(form.email, form.password, form.username)
      router.push('/chat')
    }
  } catch (err) {
    error.value = err.message || 'An error occurred'
  }
}

const handleResetPassword = async () => {
  try {
    error.value = ''
    await resetPassword(resetEmail.value)
    showResetPassword.value = false
    resetEmail.value = ''
    // Show success message
  } catch (err) {
    error.value = err.message || 'Failed to send reset email'
  }
}

const loginWithGoogle = async () => {
  try {
    error.value = ''
    await loginWithGoogle()
    router.push('/chat')
  } catch (err) {
    error.value = err.message || 'Google login failed'
  }
}
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.auth-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group button {
  width: 100%;
  padding: 0.75rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.form-group button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.form-actions {
  margin-top: 1rem;
  text-align: center;
}

.form-actions button {
  margin: 0.5rem 0;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #2563eb;
  color: #2563eb;
  border-radius: 4px;
  cursor: pointer;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  color: #333;
}

.google-btn img {
  width: 20px;
  height: 20px;
}

.link-btn {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  padding: 0.5rem 0;
}

.reset-password {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
}

.cancel-btn {
  background: #ef4444;
  color: white;
  margin-left: 0.5rem;
}

.error {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 4px;
  text-align: center;
}
</style>
```

#### `middleware/auth.client.ts`
```typescript
export default defineNuxtRouteMiddleware(() => {
  const { user, loading } = useFirebase()
  
  if (loading.value) {
    // Still loading, wait for auth state
    return
  }
  
  if (!user.value) {
    // Not authenticated, redirect to login
    return navigateTo('/login')
  }
})
```

### 4.3 Real-time Listeners Implementation

#### `composables/useRealtimeChat.ts`
```typescript
import { ref, reactive, onUnmounted } from 'vue'
import { useFirebase } from './useFirebase'

export const useRealtimeChat = () => {
  const { db, auth } = useFirebase()
  const { subscribeToMessages, subscribeToConversations } = useFirebase()
  
  const messages = ref({})
  const conversations = ref([])
  const loading = ref(true)
  const error = ref(null)
  
  let messageUnsubscribe = null
  let conversationUnsubscribe = null
  
  const loadConversations = async (userId: string) => {
    try {
      loading.value = true
      error.value = null
      
      conversationUnsubscribe = subscribeToConversations(userId, (convData) => {
        conversations.value = convData
        loading.value = false
      })
    } catch (err) {
      error.value = err.message
      loading.value = false
    }
  }
  
  const loadMessages = async (conversationId: string) => {
    try {
      loading.value = true
      error.value = null
      
      if (messageUnsubscribe) {
        messageUnsubscribe()
      }
      
      messageUnsubscribe = subscribeToMessages(conversationId, (msgData) => {
        // Group messages by date
        const grouped = {}
        for (const message of msgData) {
          const date = message.created_at?.toDate().toISOString().split('T')[0]
          if (!grouped[date]) {
            grouped[date] = []
          }
          grouped[date].push(message)
        }
        
        messages.value = grouped
        loading.value = false
      })
    } catch (err) {
      error.value = err.message
      loading.value = false
    }
  }
  
  const sendMessage = async (conversationId: string, content: string, file?: File) => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('User not authenticated')
      
      let fileUrl = ''
      if (file) {
        fileUrl = await useFirebase().uploadFile(file, userId)
      }
      
      // Add message to Firestore
      const messageRef = collection(db, 'messages')
      await addDoc(messageRef, {
        rId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversation_id: conversationId,
        sender_id: userId,
        content,
        file_url: fileUrl,
        file_extension: file?.name.split('.').pop() || '',
        file_size: file?.size || 0,
        reply_to_rId: null,
        delivered_at: null,
        read_at: null,
        created_at: new Date(),
        updated_at: new Date()
      })
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  const deleteMessage = async (messageId: string, mode: 'me' | 'all') => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('User not authenticated')
      
      if (mode === 'me') {
        // Add to message_deletions collection
        await addDoc(collection(db, 'message_deletions'), {
          message_rId: messageId,
          user_id: userId,
          created_at: new Date()
        })
      } else {
        // Delete the message document
        await deleteDoc(doc(db, 'messages', messageId))
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  const markAsRead = async (conversationId: string) => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) throw new Error('User not authenticated')
      
      // Update all unread messages in conversation
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversation_id', '==', conversationId),
        where('sender_id', '!=', userId),
        where('read_at', '==', null)
      )
      
      const messagesSnapshot = await getDocs(messagesQuery)
      
      const batch = writeBatch(db)
      messagesSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read_at: new Date(),
          updated_at: new Date()
        })
      })
      
      await batch.commit()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  // Cleanup on unmount
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
    deleteMessage,
    markAsRead
  }
}
```

#### `components/chat/MessageList.vue`
```vue
<template>
  <div class="message-list">
    <div v-if="loading" class="loading">
      Loading messages...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="messages-container">
      <div v-for="(messages, date) in messages" :key="date" class="date-group">
        <div class="date-header">
          {{ formatDate(date) }}
        </div>
        
        <div class="messages">
          <div 
            v-for="message in messages" 
            :key="message.id"
            class="message"
            :class="{ 'own-message': message.sender_id === currentUserId }"
          >
            <div class="message-content">
              <div class="message-header">
                <img 
                  :src="message.sender.image || defaultAvatar" 
                  :alt="message.sender.name"
                  class="avatar"
                />
                <div class="message-meta">
                  <span class="sender-name">{{ message.sender.name }}</span>
                  <span class="message-time">{{ formatTime(message.created_at) }}</span>
                </div>
              </div>
              
              <div class="message-body">
                <div v-if="message.reply_to" class="reply-to">
                  <div class="reply-content">
                    <strong>{{ message.reply_to.sender.name }}:</strong>
                    {{ message.reply_to.content }}
                  </div>
                </div>
                
                <div v-if="message.file" class="message-file">
                  <a :href="message.file" target="_blank" rel="noopener">
                    <div class="file-icon">
                      {{ getFileIcon(message.file_extension) }}
                    </div>
                    <div class="file-info">
                      <div class="file-name">{{ getFileFromUrl(message.file) }}</div>
                      <div class="file-size">{{ formatFileSize(message.file_size) }}</div>
                    </div>
                  </a>
                </div>
                
                <div v-if="message.content" class="text-content">
                  {{ message.content }}
                </div>
              </div>
              
              <div class="message-actions">
                <button 
                  v-if="message.sender_id === currentUserId"
                  @click="showDeleteOptions = showDeleteOptions === message.id ? null : message.id"
                  class="action-btn"
                >
                  <span>⋮</span>
                </button>
                
                <div v-if="showDeleteOptions === message.id" class="delete-options">
                  <button 
                    @click="deleteMessage(message.id, 'me')"
                    class="delete-btn"
                  >
                    Delete for me
                  </button>
                  <button 
                    @click="deleteMessage(message.id, 'all')"
                    class="delete-btn delete-all"
                  >
                    Delete for everyone
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRealtimeChat } from '~/composables/useRealtimeChat'
import { useFirebase } from '~/composables/useFirebase'

const props = defineProps({
  conversationId: {
    type: String,
    required: true
  }
})

const { messages, loading, error, loadMessages, deleteMessage } = useRealtimeChat()
const { user } = useFirebase()
const currentUserId = computed(() => user.value?.uid)
const showDeleteOptions = ref(null)

const defaultAvatar = 'https://api.dicebear.com/9.x/initials/svg?seed=default&backgroundColor=2563eb&textColor=ffffff'

onMounted(async () => {
  await loadMessages(props.conversationId)
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString()
  }
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

const getFileIcon = (extension) => {
  const icons = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📄',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎬',
    mov: '🎬',
    mp3: '🎵',
    wav: '🎵',
    zip: '📦',
    rar: '📦'
  }
  return icons[extension?.toLowerCase()] || '📎'
}

const getFileFromUrl = (url) => {
  if (!url) return ''
  return url.split('/').pop()
}

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.message-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  max-height: 100%;
  overflow-y: auto;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #dc2626;
}

.date-group {
  margin-bottom: 1rem;
}

.date-header {
  text-align: center;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message {
  display: flex;
  gap: 0.5rem;
}

.own-message {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.own-message .message-content {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.own-message .message-header {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.message-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.own-message .message-meta {
  align-items: flex-end;
}

.sender-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.message-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.message-body {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.own-message .message-body {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.reply-to {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 0.875rem;
}

.own-message .reply-to {
  background: rgba(255, 255, 255, 0.1);
}

.text-content {
  word-wrap: break-word;
}

.message-file {
  margin-top: 0.5rem;
}

.file-icon {
  display: inline-block;
  margin-right: 0.5rem;
  font-size: 1.25rem;
}

.file-info {
  display: inline-block;
  vertical-align: middle;
}

.file-name {
  font-weight: 500;
}

.file-size {
  font-size: 0.75rem;
  color: #64748b;
}

.own-message .file-size {
  color: rgba(255, 255, 255, 0.8);
}

.message-actions {
  position: relative;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: #64748b;
}

.action-btn:hover {
  background: #f1f5f9;
}

.own-message .action-btn {
  color: rgba(255, 255, 255, 0.8);
}

.own-message .action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.delete-options {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.delete-btn {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #e2e8f0;
}

.delete-btn:last-child {
  border-bottom: none;
}

.delete-btn:hover {
  background: #f1f5f9;
}

.delete-all {
  color: #dc2626;
}

.delete-all:hover {
  background: #fef2f2;
}
</style>
```

### 4.4 UI/UX Updates

#### `components/chat/ChatInterface.vue`
```vue
<template>
  <div class="chat-container">
    <div class="chat-sidebar">
      <div class="user-profile">
        <img :src="user?.photoURL || defaultAvatar" :alt="user?.displayName" class="user-avatar" />
        <div class="user-info">
          <div class="user-name">{{ user?.displayName }}</div>
          <div class="user-email">{{ user?.email }}</div>
        </div>
        <button @click="logout" class="logout-btn">Logout</button>
      </div>
      
      <div class="conversations-list">
        <div class="conversations-header">
          <h3>Conversations</h3>
          <button @click="showNewChat = true" class="new-chat-btn">
            New Chat
          </button>
        </div>
        
        <div v-if="loading" class="loading">
          Loading conversations...
        </div>
        
        <div v-else-if="conversations.length === 0" class="empty-state">
          No conversations yet. Start a new chat!
        </div>
        
        <div v-else class="conversations">
          <div 
            v-for="conversation in conversations" 
            :key="conversation.id"
            class="conversation-item"
            :class="{ active: selectedConversation?.id === conversation.id }"
            @click="selectConversation(conversation)"
          >
            <div class="conversation-avatar">
              <img 
                :src="getConversationAvatar(conversation)" 
                :alt="getConversationName(conversation)"
                class="avatar"
              />
            </div>
            
            <div class="conversation-info">
              <div class="conversation-name">
                {{ getConversationName(conversation) }}
              </div>
              <div class="conversation-preview">
                {{ getLastMessage(conversation) }}
              </div>
              <div class="conversation-meta">
                <span class="message-time">{{ formatLastMessageTime(conversation) }}</span>
                <span v-if="conversation.unread_count > 0" class="unread-count">
                  {{ conversation.unread_count }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-main">
      <div v-if="!selectedConversation" class="empty-chat">
        <h2>Welcome to Chat App</h2>
        <p>Select a conversation or start a new one</p>
      </div>
      
      <div v-else class="chat-window">
        <div class="chat-header">
          <div class="chat-title">
            {{ getConversationName(selectedConversation) }}
          </div>
          <div class="chat-actions">
            <button @click="deleteConversation(selectedConversation.id)" class="action-btn">
              Delete Chat
            </button>
          </div>
        </div>
        
        <MessageList :conversation-id="selectedConversation.id" />
        
        <MessageInput 
          :conversation-id="selectedConversation.id"
          @send="sendMessage"
        />
      </div>
    </div>
    
    <!-- New Chat Modal -->
    <div v-if="showNewChat" class="modal-overlay" @click="showNewChat = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>New Chat</h3>
          <button @click="showNewChat = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="contact-search">Search contacts</label>
            <input
              type="text"
              id="contact-search"
              v-model="contactSearch"
              placeholder="Enter phone number or username"
            />
          </div>
          
          <div v-if="loadingContacts" class="loading">
            Searching...
          </div>
          
          <div v-else-if="searchResults.length > 0" class="search-results">
            <div 
              v-for="contact in searchResults" 
              :key="contact.id"
              class="contact-item"
              @click="startNewChat(contact)"
            >
              <img :src="contact.image || defaultAvatar" :alt="contact.name" class="avatar" />
              <div class="contact-info">
                <div class="contact-name">{{ contact.name }}</div>
                <div class="contact-phone">{{ contact.phone_number }}</div>
              </div>
            </div>
          </div>
          
          <div v-else-if="contactSearch" class="no-results">
            No contacts found
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFirebase } from '~/composables/useFirebase'
import { useRealtimeChat } from '~/composables/useRealtimeChat'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const router = useRouter()
const { user, logout } = useFirebase()
const { conversations, loading, loadConversations } = useRealtimeChat()
const { getAllUsers } = useFirebase()

const selectedConversation = ref(null)
const showNewChat = ref(false)
const contactSearch = ref('')
const searchResults = ref([])
const loadingContacts = ref(false)
const allUsers = ref([])

const defaultAvatar = 'https://api.dicebear.com/9.x/initials/svg?seed=default&backgroundColor=2563eb&textColor=ffffff'

onMounted(async () => {
  await loadConversations(user.value?.uid)
  await loadAllUsers()
})

const loadAllUsers = async () => {
  try {
    allUsers.value = await getAllUsers()
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

const selectConversation = (conversation) => {
  selectedConversation.value = conversation
  // Mark conversation as read
  // markAsRead(conversation.id)
}

const getConversationName = (conversation) => {
  if (conversation.name) {
    return conversation.name
  }
  
  // For DM conversations, get the other participant's name
  if (conversation.other_participant) {
    return conversation.other_participant.name
  }
  
  return 'Unknown'
}

const getConversationAvatar = (conversation) => {
  if (conversation.avatar) {
    return conversation.avatar
  }
  
  if (conversation.other_participant) {
    return conversation.other_participant.image || defaultAvatar
  }
  
  return defaultAvatar
}

const getLastMessage = (conversation) => {
  return conversation.last_message || 'No messages yet'
}

const formatLastMessageTime = (conversation) => {
  if (!conversation.last_message_at) return ''
  
  const date = new Date(conversation.last_message_at)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

const searchContacts = async () => {
  if (!contactSearch.value.trim()) {
    searchResults.value = []
    return
  }
  
  loadingContacts.value = true
  
  try {
    const search = contactSearch.value.toLowerCase()
    const results = allUsers.value.filter(user => 
      user.username.toLowerCase().includes(search) ||
      user.phone_number?.includes(search)
    )
    
    searchResults.value = results.slice(0, 10) // Limit to 10 results
  } catch (error) {
    console.error('Error searching contacts:', error)
  } finally {
    loadingContacts.value = false
  }
}

// Watch for search changes
let searchTimeout
contactSearch.value = watch(contactSearch, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(searchContacts, 300)
})

const startNewChat = async (contact) => {
  try {
    // Create new conversation
    const newConversation = await getOrCreateDMConversation(
      user.value.uid,
      contact.id,
      user.value.uid
    )
    
    selectedConversation.value = newConversation
    showNewChat.value = false
    contactSearch.value = ''
    searchResults.value = []
  } catch (error) {
    console.error('Error starting new chat:', error)
  }
}

const deleteConversation = async (conversationId) => {
  if (!confirm('Are you sure you want to delete this conversation?')) {
    return
  }
  
  try {
    await deleteConversation(conversationId)
    selectedConversation.value = null
  } catch (error) {
    console.error('Error deleting conversation:', error)
  }
}

const sendMessage = async (content, file) => {
  if (!selectedConversation.value) return
  
  try {
    await sendMessage(selectedConversation.value.id, content, file)
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f8fafc;
}

.chat-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.user-profile {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
}

.user-email {
  font-size: 0.875rem;
  color: #64748b;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.logout-btn:hover {
  background: #dc2626;
}

.conversations-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversations-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversations-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.new-chat-btn {
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.new-chat-btn:hover {
  background: #1d4ed8;
}

.loading, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.conversations {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background: #f8fafc;
}

.conversation-item.active {
  background: #eff6ff;
}

.conversation-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-name {
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-preview {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.message-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.unread-count {
  background: #2563eb;
  color: white;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #64748b;
}

.empty-chat h2 {
  margin-bottom: 0.5rem;
}

.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-title {
  font-weight: 600;
  font-size: 1rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.action-btn:hover {
  background: #dc2626;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
}

.close-btn:hover {
  color: #1e293b;
}

.modal-body {
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.contact-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.contact-item:hover {
  background: #f8fafc;
}

.contact-info {
  flex: 1;
}

.contact-name {
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.contact-phone {
  font-size: 0.75rem;
  color: #64748b;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}
</style>
```

## Testing Checklist

### 4.1 Firebase SDK Integration
- [ ] Firebase SDK is properly installed and configured
- [ ] Environment variables are loaded correctly
- [ ] Firebase services are accessible throughout the app
- [ ] Connectivity tests pass

### 4.2 Authentication Flow Update
- [ ] Login/register works with Firebase Auth
- [ ] Google authentication works
- [ ] Password reset functionality works
- [ ] Authentication state persists correctly

### 4.3 Real-time Listeners Implementation
- [ ] Message updates work in real-time
- [ ] Conversation list updates automatically
- [ ] Typing indicators work
- [ ] Offline handling is implemented

### 4.4 UI/UX Updates
- [ ] All UI components work with Firebase data
- [ ] Loading states are displayed correctly
- [ ] Error handling is user-friendly
- [ ] Performance is acceptable

## Potential Issues and Solutions

### Issue: Real-time listener performance
**Solution**: Implement proper cleanup and pagination for large datasets

### Issue: Authentication state persistence
**Solution**: Ensure proper session handling and error recovery

### Issue: UI responsiveness with real-time updates
**Solution**: Implement efficient re-rendering and virtual scrolling

## Next Steps
After completing Phase 4, proceed to Phase 5: Testing & Deployment