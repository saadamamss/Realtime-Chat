// One-off backfill: creates top-level 'memberships' mirror docs from the
// existing nested participants/{conversationId}/participants/{userId} docs.
// Run once: node backfill-memberships.mjs
import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, getDocs, collection, collectionGroup, setDoc, query } from 'firebase/firestore'

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

const app = initializeApp(config)
const db = getFirestore(app)

console.log('🔄 Backfilling memberships collection...')
const partsSnapshot = await getDocs(collectionGroup(db, 'participants'))
console.log(`   found ${partsSnapshot.docs.length} participant docs`)

let created = 0
for (const d of partsSnapshot.docs) {
  const data = d.data()
  if (!data.user_id || !data.conversation_id) {
    // Skip the top-level participants/{convId} parent doc if it exists
    continue
  }
  const memberId = `${data.conversation_id}_${data.user_id}`
  const existing = await getDoc(doc(db, 'memberships', memberId))
  if (existing.exists()) {
    console.log(`   ✓ already exists: ${memberId}`)
    continue
  }
  await setDoc(doc(db, 'memberships', memberId), {
    user_id: data.user_id,
    conversation_id: data.conversation_id,
    hidden: data.hidden ?? false,
    deleted_at: data.deleted_at ?? null,
    updated_at: new Date().toISOString(),
  })
  console.log(`   ✓ created: ${memberId}`)
  created++
}

console.log(`🎉 Backfill complete — ${created} membership docs created`)
process.exit(0)
