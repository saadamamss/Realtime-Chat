# Phase 1: Preparation & Setup

## Overview
This phase focuses on setting up the Firebase project, installing necessary dependencies, and preparing the development environment for the migration.

## Tasks

### 1.1 Firebase Project Creation
- [ ] Create a new Firebase project in the Firebase Console
- [ ] Enable Firebase Authentication
- [ ] Enable Firestore Database
- [ ] Enable Firebase Storage
- [ ] Configure project settings (region, security rules)

### 1.2 Firebase SDK Installation
- [ ] Install Firebase SDKs in the project
- [ ] Update package.json with Firebase dependencies
- [ ] Configure Firebase SDK initialization

### 1.3 Environment Configuration
- [ ] Create Firebase configuration file
- [ ] Update environment variables
- [ ] Set up Firebase service account for server-side access

### 1.4 Development Environment Setup
- [ ] Set up Firebase CLI
- [ ] Configure local development environment
- [ ] Create development database instance
- [ ] Set up Firebase emulators for testing

## Implementation Files

### 1.1 Firebase Configuration

#### `firebase.config.ts`
```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Your web app's Firebase configuration
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

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Export Firebase app instance
export default app
```

#### `firebase.admin.config.ts`
```typescript
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

// Service account configuration
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
})

// Export Firebase Admin services
export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
export const adminStorage = getStorage(app)
```

### 1.2 Updated Dependencies

#### `package.json` additions
```json
{
  "dependencies": {
    "firebase": "^10.0.0",
    "firebase-admin": "^11.0.0",
    "@nuxtjs/firebase": "^10.0.0"
  },
  "devDependencies": {
    "@firebase/testing": "^0.22.0"
  }
}
```

### 1.3 Environment Variables

#### `.env.firebase`
```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id

# Firebase Service Account
FIREBASE_TYPE=service_account
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=your_auth_uri
FIREBASE_TOKEN_URI=your_token_uri
FIREBASE_AUTH_PROVIDER_CERT_URL=your_auth_provider_cert_url
FIREBASE_CLIENT_CERT_URL=your_client_cert_url
```

### 1.4 Nuxt Configuration

#### `nuxt.config.ts` Firebase integration
```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/firebase'
  ],
  firebase: {
    config: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    },
    services: {
      auth: {
        emulatorPort: 9099, // Optional: Firebase Auth emulator
        persistence: 'local'
      },
      firestore: {
        emulatorPort: 8080 // Optional: Firestore emulator
      },
      storage: {
        emulatorPort: 9199 // Optional: Firebase Storage emulator
      }
    }
  }
})
```

## Testing Checklist

### 1.1 Firebase Project Setup
- [ ] Firebase project is created and accessible
- [ ] Authentication is enabled with email/password provider
- [ ] Firestore database is created in test mode
- [ ] Storage bucket is configured with appropriate rules

### 1.2 SDK Installation
- [ ] Firebase SDK is installed and imports work correctly
- [ ] Firebase Admin SDK is installed for server-side operations
- [ ] Nuxt Firebase module is configured properly

### 1.3 Environment Configuration
- [ ] Environment variables are loaded correctly
- [ ] Firebase configuration is accessible in the application
- [ ] Service account is configured for server access

### 1.4 Development Environment
- [ ] Firebase CLI is installed and authenticated
- [ ] Emulators are running and accessible
- [ ] Local development environment uses emulators correctly

## Potential Issues and Solutions

### Issue: Firebase SDK conflicts
**Solution**: Ensure proper version compatibility and use separate instances for client and server

### Issue: Environment variable loading
**Solution**: Verify .env files are in the correct location and properly formatted

### Issue: Firebase emulator connectivity
**Solution**: Check firewall settings and ensure emulators are running on correct ports

## Next Steps
After completing Phase 1, proceed to Phase 2: Schema Design & Migration Scripts