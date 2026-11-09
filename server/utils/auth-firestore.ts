import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
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
const auth = getAuth(app)

export async function createUserWithEmailAndPasswordFirebase(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function signInWithEmailAndPasswordFirebase(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error('Error signing in user:', error)
    throw error
  }
}

export async function signOutFirebase() {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Error signing out user:', error)
    throw error
  }
}

export async function getCurrentUserFirebase() {
  return auth.currentUser
}

export async function sendPasswordResetEmailFirebase(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

export async function signInWithGoogleFirebase() {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    return userCredential.user
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

// JWT token functions for backward compatibility
export async function createFirebaseUserToken(userId: string) {
  try {
    // In a real implementation, you would create a custom token
    // For now, return a simple token
    return `firebase_token_${userId}_${Date.now()}`
  } catch (error) {
    console.error('Error creating custom token:', error)
    throw error
  }
}

export async function verifyFirebaseToken(token: string) {
  try {
    // In a real implementation, you would verify the token
    // For now, return a simple user object
    if (token.startsWith('firebase_token_')) {
      const userId = token.replace('firebase_token_', '').split('_')[0]
      return { userId }
    }
    return null
  } catch (error) {
    console.error('Error verifying Firebase token:', error)
    return null
  }
}

// Middleware to verify Firebase token
export async function verifyFirebaseTokenMiddleware(token: string) {
  try {
    const decodedToken = await verifyFirebaseToken(token)
    if (!decodedToken) {
      throw new Error('Invalid token')
    }
    return decodedToken
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}