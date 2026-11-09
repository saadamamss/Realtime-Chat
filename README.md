# 💬 Chat App

A **real-time messaging application** built with Nuxt 4, featuring live WebSocket communication, file sharing, voice recording, message replies, read receipts, and more.

![Chat App](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite)
![WebSocket](https://img.shields.io/badge/WebSocket-Nitro-000000)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **Real-time Messaging** | Instant message delivery via WebSockets |
| ✅ **Sent / Delivered / Read status** | Three-tier message status with visual icons (✓ ✓✓ ✓✓ blue) |
| 🔵 **Online Presence** | See who's online with live presence indicators |
| 📎 **File Sharing** | Send images, videos, audio files, and documents (max 2MB) |
| 🎤 **Voice Recording** | Record and send audio messages directly from the browser |
| ↩️ **Message Reply** | Reply to any message with a preview banner and scroll-to-original |
| 🗑️ **Delete Messages** | Delete for yourself or for everyone (sender only) |
| 🔴 **Unread Badges** | Visual badge counts on conversations |
| 👥 **Contacts** | Add/remove contacts by phone number |
| 📱 **Responsive** | Resizable sidebar on desktop, drawer navigation on mobile |
| 🌙 **Pagination** | Infinite scroll for loading older messages |
| 🔄 **Optimistic UI** | Messages appear instantly with retry on failure |

---

## 🖥️ Screenshots

> *Add screenshots or a GIF here to showcase the app.*

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/chat-app.git
cd chat-app

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Enter a name and phone number to join.

> **Tip:** Open two browser tabs with different names/phone numbers to test real-time messaging.

### Production

```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

```
chat-app/
├── app/                          # Frontend (Vue 3 + Nuxt UI)
│   ├── components/
│   │   ├── ChatLayout.vue        # Main layout — sidebar + chat area
│   │   ├── ChatMessages.vue      # Chat window — messages list + input
│   │   ├── ChatMessageCard.vue   # Individual message bubble
│   │   ├── ChatLogo.vue          # App logo
│   │   └── CircleProgress.vue    # SVG upload progress indicator
│   ├── composables/
│   │   └── useToast.ts           # Toast notification helper
│   ├── plugins/
│   │   ├── auth.ts               # Axios instance + auth state (localStorage)
│   │   └── websocket.client.ts   # WebSocket client with auto-reconnect
│   └── types/                    # TypeScript type definitions
├── server/                       # Backend (Nitro)
│   ├── api/                      # REST API endpoints
│   │   ├── auth/login.post.ts    # User login / registration
│   │   ├── contacts.*.ts         # Contacts CRUD
│   │   ├── conversations.*.ts    # Conversations CRUD
│   │   ├── messages.*.ts         # Messages CRUD
│   │   └── messages/delete.post.ts # Message deletion
│   ├── routes/ws.ts              # WebSocket handler
│   └── utils/
│       ├── db.ts                 # SQLite database layer (schema, queries, migrations)
│       └── ws.ts                 # WebSocket peer & pub/sub management
├── data/                         # SQLite database files
├── public/uploads/               # Uploaded files
└── nuxt.config.ts                # Nuxt configuration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Nuxt 4](https://nuxt.com/) (SPA mode) |
| **UI** | [Nuxt UI](https://ui.nuxt.com/) + Tailwind CSS |
| **Backend** | [Nitro](https://nitro.unjs.io/) (Nuxt's server engine) |
| **Database** | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **Real-time** | WebSockets via Nitro's `defineWebSocketHandler` |
| **HTTP Client** | Axios |
| **Icons** | [Phosphor Icons](https://phosphoricons.com/) via Iconify |

---

## 🌐 WebSocket Protocol

| Event | Direction | Purpose |
|-------|-----------|---------|
| `identify` | Client → Server | Register user for presence |
| `join` / `leave` | Client → Server | Subscribe/unsubscribe to conversation |
| `ping` | Client → Server | Connection heartbeat |
| `new-message` | Server → Client | New message in a conversation |
| `message-deleted` | Server → Client | Message removed by someone |
| `delivery-update` | Server → Client | Message delivered to recipient |
| `read-update` | Server → Client | Messages read by recipient |
| `user-online` / `user-offline` | Server → Client | Presence changes |
| `presence-snapshot` | Server → Client | Initial online user list |

---

## 📋 Feature Roadmap

Detailed implementation plans for upcoming features:

- [ ] **Message Search** ([Plans](plans/coming-soon/message-search.md)) - Full-text search across all messages
- [ ] **Group Conversations** ([Plans](plans/coming-soon/group-conversations.md)) - Create and manage group chats
- [ ] **Media Gallery** ([Plans](plans/coming-soon/media-gallery.md)) - Browse all media files in a dedicated gallery
- [ ] **Push Notifications** ([Plans](plans/coming-soon/push-notifications.md)) - Real-time notifications across devices
- [ ] **End-to-End Encryption** ([Plans](plans/coming-soon/end-to-end-encryption.md)) - Encrypted messaging

See [Roadmap](plans/roadmap.md) for existing phases and [Coming Soon Plans](plans/coming-soon/) for detailed specifications.

---

## 🤝 Contributing

This is a personal project, but suggestions and PRs are welcome! Feel free to open an issue for bugs or feature requests.

---

## 📄 License

[MIT](LICENSE)

---

<p align="center">Built with ❤️ using <a href="https://nuxt.com/">Nuxt</a></p>
