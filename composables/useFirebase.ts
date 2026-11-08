import { ref } from 'vue'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

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
const auth = getAuth(app)

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
      // In a real implementation, you would update the user profile
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
  
  return {
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle
  }
}