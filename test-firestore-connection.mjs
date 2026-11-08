// Test Firestore connectivity
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore'
import 'dotenv/config'

console.log('🧪 Testing Firestore Connection...\n')

// Check credentials
if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
  console.log('❌ Firebase credentials not found in environment variables')
  console.log('Please add these to your .env file:')
  console.log('FIREBASE_API_KEY=your-api-key')
  console.log('FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com')
  console.log('FIREBASE_PROJECT_ID=your-project-id')
  console.log('FIREBASE_STORAGE_BUCKET=your-project.appspot.com')
  console.log('FIREBASE_MESSAGING_SENDER_ID=your-sender-id')
  console.log('FIREBASE_APP_ID=your-app-id')
  process.exit(1)
}

console.log('✅ Firebase credentials found')
console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID)

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

try {
  console.log('\n📤 Testing Firestore connection...')

  // Create a test document
  const testDocId = 'test-' + Date.now()
  const testRef = doc(db, 'migration_test', testDocId)
  await setDoc(testRef, {
    message: 'Firestore connection test',
    created_at: serverTimestamp()
  })
  console.log('✅ Test document created:', testDocId)

  // Read it back
  const snapshot = await getDocs(collection(db, 'migration_test'))
  console.log('✅ Read back', snapshot.size, 'document(s) from migration_test')

  // Clean up
  await deleteDoc(testRef)
  console.log('🧹 Test document deleted')

  console.log('\n🎉 Firestore connection test completed successfully!')
  console.log('📋 Ready to run the SQLite → Firestore migration!')
} catch (error) {
  console.error('❌ Firestore connection test failed:', error.message)
  console.log('\n🔧 Troubleshooting tips:')
  console.log('1. Make sure you created a Firestore Database in the Firebase Console')
  console.log('2. Check your Firebase credentials in .env file')
  console.log('3. Ensure Firestore rules allow reads/writes (test mode)')
  console.log('4. Verify your internet connection')
}
