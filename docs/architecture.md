# Architecture

## High-Level Flow

```
User Action → Vue Component → Axios (HTTP) → Nitro API Route → db.ts → SQLite
                              WebSocket (crossws) → Real-time broadcast to other clients
```

---

## Directory Structure

```
chat-app/
├── server/
│   ├── utils/
│   │   ├── db.ts          Database layer (schema, CRUD, migrations)
│   │   └── ws.ts          WebSocket presence, pub/sub, peer tracking
│   ├── routes/
│   │   └── ws.ts          WebSocket route handler (open/message/close)
│   └── api/
│       ├── auth/
│       │   └── login.post.ts
│       ├── conversations.post.ts
│       ├── conversations.get.ts
│       ├── conversations.delete.ts
│       ├── conversations/
│       │   └── wipe.post.ts
│       ├── contacts.post.ts
│       ├── contacts.get.ts
│       ├── contacts.delete.ts
│       ├── messages.post.ts
│       ├── messages.get.ts
│       ├── messages/
│       │   └── delete.post.ts
│       └── users.get.ts
├── app/
│   ├── app.vue                     Root (login / main layout)
│   ├── assets/css/main.css         Tailwind theme
│   ├── components/
│   │   ├── ChatLayout.vue          Main layout: sidebar + chat area
│   │   ├── ChatMessages.vue         Chat messages, input, file uploads
│   │   ├── ChatMessageCard.vue      Individual message bubble
│   │   ├── CircleProgress.vue       Circular progress indicator
│   │   └── ChatLogo.vue             SVG logo
│   ├── composables/
│   │   └── useToast.ts              Toast notification wrapper
│   ├── plugins/
│   │   ├── auth.ts                  Auth plugin ($axios, $auth)
│   │   └── websocket.client.ts      WebSocket client ($ws)
│   └── types/
│       ├── index.ts                 Interface definitions
│       └── nuxt.d.ts                Type augmentations for $plugins
├── docs/                            Project documentation
├── data/                            SQLite database (gitignored)
└── public/uploads/                  Uploaded files
```

---

## Key Design Patterns

### 1. Optimistic UI

Messages appear in the chat instantly (before server confirmation):

```
sendMessage()
  ├── Create optimistic message with random temp rId + status 'sending'
  ├── Append to chatData (visible immediately)
  ├── POST /api/messages (FormData with file + metadata)
  │     ├── On success → status → 'sent', cancelTokenSource removed
  │     └── On failure → status → 'failed', retry button shown
  └── On upload progress → pendingMessages[rId].progress updated
```

### 2. Auth Model

No passwords or tokens. The user is identified by `x-user-id` header:

- Login: `POST /api/auth/login` with `{ username, phone_number }`
- Server upserts the user (find by phone, update name; or create)
- Response includes `user.id`
- Stored in `localStorage('chat_user')`
- Subsequent requests send `x-user-id: <id>` header
- All API routes validate this header (401 if missing)

### 3. Refs vs Comptables for Badge State

The "X unread messages" badge uses a dedicated `unreadBadgeCount` ref rather than a reactive computed, to avoid flickering when messages are stamped as read:

```
chatData (ref)  →  computed: firstUnreadRId (positions the badge)
                →  unreadBadgeCount (ref, set once on load)
                →  badge shows while unreadBadgeCount > 0
                →  badge cleared only on: send message OR receive new message
```

### 4. WebSocket + REST Coordination

- **REST** handles CRUD (fetch conversations, send messages, manage contacts)
- **WebSocket** handles real-time events (new message, read receipts, presence)
- Messages are sent via REST, then the server broadcasts the result via WS
- The sender receives their own WS broadcast too (which replaces the optimistic message with the confirmed server version)

---

## Component Communication

```
app.vue
  └── ChatLayout.vue
        ├── Loads data (contacts, conversations) on mount
        ├── Manages sidebar state (chats/contacts/add-contact views)
        ├── Resizable sidebar (width stored in localStorage)
        ├── Drawer mode on small screens (< 760px)
        ├── WebSocket listener for new messages, presence
        ├── Context menu (add contact, wipe, delete)
        └── ChatMessages.vue (child)
              ├── Props: conversationId
              ├── Emits: loaded
              ├── Fetches + displays paginated messages
              ├── Sends messages with optimistic updates
              ├── Handles file uploads with progress
              ├── Reply banner
              ├── Delete dialog
              └── Unread badge

ChatMessages.vue
  └── ChatMessageCard.vue (repeated per message)
        ├── Props: message, direction, status, progress
        ├── Emits: file-preview, file-download, retry, delete, reply, scroll-to-message
        ├── Reply preview block
        ├── File display (image/video/audio/document)
        ├── Status icons (sent ✓ / delivered ✓✓ / read ✓✓ blue)
        ├── Context menu (reply, delete)
        └── Audio player (global singleton via window.currentAudioPlayer)
```

---

## Data Flow for Sending a Message

1. User types message + optionally attaches file
2. Optimistic message added to `chatData` with temp `rId`, status `'sending'`
3. `sendMessage()` POSTs to `/api/messages` with FormData
4. Server:
   a. Saves file to `public/uploads/` (if any)
   b. `addParticipant()` ensures sender is in conversation
   c. `createMessage()` inserts row
   d. Fetches reply data (if replying)
   e. `broadcastToConversation()` → WS message to all subscribers
   f. Checks `isUserSubscribed()` for other participants → if yes, `markDelivered()`, sends `delivery-update` to sender
5. Sender receives WS `new-message` → matches by `rId` → removes from `pendingMessages`, updates message fields from server
6. Other participants receive WS `new-message` → adds to their `chatData`
7. If inbound msg → sends `messages-read` WS event → server stamps `read_at` → broadcasts `read-update` to senders

---

## File Upload Flow

1. User selects file (max 2MB, validated client-side)
2. File preview shown in bar above textarea
3. On send, file added to FormData as `file` field
4. Axios `onUploadProgress` updates `pendingMessages[rId].progress`
5. Server saves file to `public/uploads/{uuid}{ext}` using original extension
6. File URL stored as `file_url` in messages table
7. Recipients download via direct URL to `public/uploads/`
