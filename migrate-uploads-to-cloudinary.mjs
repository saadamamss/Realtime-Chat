// One-off: uploads every locally-stored attachment to Cloudinary and
// rewrites the Firestore message docs' file_url to the permanent URL.
// Local files are NOT deleted (kept as backup).
// Run once: node migrate-uploads-to-cloudinary.mjs
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore'
import { v2 as cloudinary } from 'cloudinary'

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const app = initializeApp(config)
const fbDb = getFirestore(app)

const db = new Database(path.join(process.cwd(), 'data', 'chat.db'))
console.log('📖 Reading local attachments from SQLite...')
const rows = db.prepare('SELECT rId, file_url, sender_id FROM messages WHERE file_url LIKE \'/uploads/%\'').all()
console.log(`   ${rows.length} message(s) reference local /uploads files`)

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')
let migrated = 0
let skipped = 0
let failed = 0

for (const row of rows) {
  const localName = row.file_url.replace(/^\/uploads\//, '')
  const localPath = path.join(UPLOAD_DIR, localName)
  if (!fs.existsSync(localPath)) {
    console.log(`   ⚠️ missing on disk, skipping: ${localPath}`)
    skipped++
    continue
  }
  try {
    // Skip already-migrated docs (idempotent reruns)
    const existingQ = query(collection(fbDb, 'messages'), where('rId', '==', row.rId))
    const existing = await getDocs(existingQ)
    if (!existing.empty && existing.docs[0].data().file_url?.startsWith('http')) {
      console.log(`   ↔ already migrated: ${row.rId}`)
      skipped++
      continue
    }

    // Cloudinary routes non-images: media → video endpoint, docs → raw
    const ext = localName.split('.').pop()?.toLowerCase() || ''
    const resourceType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || ext === 'pdf'
      ? 'image'
      : ['mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a'].includes(ext)
        ? 'video'
        : 'raw'
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'chat-app/migrated',
      resource_type: resourceType,
    })
    // Update the Firestore message doc (matches by rId field)
    if (existing.empty) {
      console.log(`   ⚠️ no Firestore doc for rId=${row.rId}`)
      skipped++
      continue
    }
    for (const d of existing.docs) {
      await updateDoc(d.ref, { file_url: result.secure_url, updated_at: new Date().toISOString() })
    }
    console.log(`   ✓ ${row.rId} (${resourceType}) → ${result.secure_url.slice(0, 80)}…`)
    migrated++
  } catch (err) {
    console.log(`   ✗ ${row.rId}: ${err.message}`)
    failed++
  }
  // gentle pacing for the free tier
  await new Promise(r => setTimeout(r, 300))
}

console.log('\n📊 Summary:')
console.log(`   migrated: ${migrated}`)
console.log(`   skipped:  ${skipped}`)
console.log(`   failed:   ${failed}`)
process.exit(0)
