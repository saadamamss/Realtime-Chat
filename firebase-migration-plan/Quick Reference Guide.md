# Firebase Migration Quick Reference Guide

## Timeline Overview

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| Phase 1: Preparation & Setup | Week 1 | Firebase project setup, SDK installation, environment configuration |
| Phase 2: Schema Design & Migration Scripts | Week 2 | Firestore schema design, data migration scripts, validation |
| Phase 3: Backend Implementation | Week 3-4 | Database replacement, auth integration, file storage, real-time updates |
| Phase 4: Frontend Integration | Week 4 | Firebase SDK integration, auth flow, real-time listeners, UI updates |
| Phase 5: Testing & Deployment | Week 5 | Testing, optimization, deployment, monitoring |

## Key Commands

### Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Deploy to Firebase
firebase deploy

# Emulators
firebase emulators:start
```

### Migration Commands
```bash
# Run data migration
npm run migrate:to-firestore

# Validate migration
npm run migrate:validate

# Rollback migration
npm run migrate:rollback
```

### Testing Commands
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## Architecture Comparison

### SQLite → Firestore Mapping

| SQLite Table | Firestore Collection | Key Changes |
|--------------|---------------------|--------------|
| `users` | `users/{userId}` | Added timestamps, document-based structure |
| `conversations` | `conversations/{conversationId}` | Added timestamps, document-based structure |
| `conversation_participants` | `participants/{conversationId}/{userId}` | Changed to subcollection structure |
| `messages` | `messages/{messageId}` | Added timestamps, document-based structure |
| `contacts` | `contacts/{userId}/{contactId}` | Changed to subcollection structure |
| `message_deletions` | `message_deletions/{messageRId}/{userId}` | Changed to subcollection structure |

### Authentication Flow

| Current (JWT) | Firebase Auth | Key Changes |
|---------------|---------------|--------------|
| Custom JWT tokens | Firebase ID tokens | Simpler token handling |
| Custom auth middleware | Firebase auth middleware | Built-in validation |
| Manual password hashing | Firebase Auth handles | Automatic security |
| Custom session management | Firebase Auth persistence | Automatic session handling |

### Real-time Updates

| Current (WebSocket) | Firebase | Key Changes |
|--------------------|-----------|-------------|
| Custom WebSocket server | Firestore listeners | Built-in real-time |
| Manual connection management | Automatic connection handling | Simplified code |
| Custom broadcast logic | Firestore real-time updates | More reliable |
| Manual presence tracking | Firebase presence | Built-in support |

## Common Issues & Solutions

### 1. Firestore Query Performance
**Issue**: Slow queries on large datasets
**Solution**:
```javascript
// Use composite indexes
const messagesQuery = query(
  collection(db, 'messages'),
  where('conversation_id', '==', conversationId),
  where('created_at', '<=', endTimestamp),
  orderBy('created_at', 'desc'),
  limit(50)
)
```

### 2. Real-time Listener Memory Leaks
**Issue**: Memory leaks from unclean listeners
**Solution**:
```javascript
// Always unsubscribe in component cleanup
onUnmounted(() => {
  if (messageUnsubscribe) messageUnsubscribe()
  if (conversationUnsubscribe) conversationUnsubscribe()
})
```

### 3. File Upload Errors
**Issue**: Large file uploads failing
**Solution**:
```javascript
// Implement chunked upload
const uploadFileInChunks = async (file: File, chunkSize: number = 1024 * 1024) => {
  // Implementation for chunked upload
}
```

### 4. Authentication Persistence
**Issue**: Users losing login state
**Solution**:
```javascript
// Configure auth persistence
auth.setPersistence('local')
```

## Environment Variables

### Required Variables
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

## Firebase Security Rules

### Basic Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write conversations they participate in
    match /conversations/{conversationId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(conversationId)/$(request.auth.uid));
      allow create: if request.auth != null;
    }
    
    // Messages can be read by participants and written by participants
    match /messages/{messageId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(request.resource.data.conversation_id)/$(request.auth.uid));
      allow create: if request.auth != null && 
        exists(/databases/$(database)/documents/participants/$(request.resource.data.conversation_id)/$(request.auth.uid));
    }
  }
}
```

## Migration Checklist

### Pre-Migration
- [ ] Backup existing SQLite database
- [ ] Test migration scripts with sample data
- [ ] Review Firestore security rules
- [ ] Set up Firebase project and services

### During Migration
- [ ] Run migration in staging environment
- [ ] Validate data integrity after migration
- [ ] Test all functionality thoroughly
- [ ] Monitor performance during transition

### Post-Migration
- [ ] Monitor production metrics
- [ ] Gather user feedback
- [ ] Update documentation
- [ ] Plan for optimizations

## Performance Benchmarks

### Expected Performance Improvements
- **Query Speed**: 2-3x faster for complex queries
- **Real-time Updates**: Near-instant message delivery
- **Scalability**: Better handling of concurrent users
- **File Uploads**: Faster with Firebase Storage

### Monitoring Metrics
- Query response time (< 100ms)
- Real-time message delivery (< 1s)
- Error rate (< 1%)
- Memory usage (< 80%)

## Emergency Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Nuxt.js Discord**: https://discord.nuxtjs.org
- **Firebase Discord**: https://discord.gg/firebase
- **Issue Tracker**: Create GitHub issue for bugs

## Next Steps

1. **Start with Phase 1**: Set up Firebase project and SDKs
2. **Follow the phases sequentially**: Don't skip ahead
3. **Test thoroughly**: Especially data migration and real-time features
4. **Monitor closely**: After deployment, watch metrics closely
5. **Iterate**: Based on feedback and performance data

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Nuxt.js Firebase Module](https://github.com/nuxt-modules/firebase)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/rules-introduction)