# Development Guide

---

## Prerequisites

- Node.js >= 18
- npm

## Setup

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

## Scripts

| Script       | Command             | Description                         |
|--------------|---------------------|-------------------------------------|
| `dev`        | `nuxt dev`          | Start development server with HMR   |
| `build`      | `nuxt build`        | Build for production                |
| `preview`    | `nuxt preview`      | Preview production build locally    |
| `generate`   | `nuxt generate`     | Static site generation              |
| `postinstall`| `nuxt prepare`      | Generate Nuxt types (auto-runs)     |

## Build Output

```
.output/
├── public/            Static assets (including uploaded files)
├── server/
│   ├── index.mjs      Nitro server entry
│   └── chunks/        Server chunks
└── package.json       Server dependencies
```

Run with:

```bash
node .output/server/index.mjs
```

---

## Database

- **Location:** `data/chat.db`
- **Engine:** SQLite via `better-sqlite3`
- **Journal mode:** WAL (Write-Ahead Logging)
- **Foreign keys:** Enabled

### When Schema Changes

If you modify a table definition in `initSchema()`, delete the database files so the schema is rebuilt:

```bash
rm -f data/chat.db*
```

The `data/` directory is gitignored.

### Resetting Data

```bash
rm -f data/chat.db*
npm run dev
```

This recreates the database with fresh seed users (Alice, Bob, Charlie).

---

## Configuration

### `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,                                     // SPA mode
  modules: ['@nuxt/ui'],                          // UI library
  nitro: { experimental: { websocket: true } },   // WebSocket support
})
```

### Tailwind Theme (`app/assets/css/main.css`)

```css
@theme {
  --color-message-out: #2563eb;
  --color-message-in: #f1f5f9;
  --color-chat-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;
  --color-danger: #ef4444;
  --color-success: #22c55e;
}
```

---

## Project Conventions

### Code Style

- **No comments** in production code (as per project convention)
- TypeScript for all server and app code
- Vue 3 `<script setup>` with Composition API
- PascalCase for component files (e.g., `ChatLayout.vue`)
- camelCase for utility files (e.g., `useToast.ts`)

### Type System

All shared types in `app/types/index.ts`:

```ts
ChatUser, ChatMessage, ChatData, FilePreview, ReplyTo,
PendingMessage, MessageStatus, SocketMessage
```

Nuxt plugin types augmented in `app/types/nuxt.d.ts` for:
- `$axios` — Axios instance
- `$auth` — Auth plugin (currentUser, login, logout)
- `$ws` — WebSocket plugin (connected, onlineUsers, methods)

### API Routes

- Located in `server/api/` following Nuxt file-based routing
- Named `{method}.ts` (e.g., `messages.post.ts`, `messages.get.ts`)
- User identification via `x-user-id` header (read via `getHeader(event, 'x-user-id')`)
- Errors thrown via `createError({ statusCode, statusMessage })`

### Database Layer

- All database logic in `server/utils/db.ts`
- Singleton pattern via `getDb()`
- Migrations are sequential functions (`migrateV1` → `migrateV7`)
- Query results typed as `any[]` (SQLite returns plain objects)

### WebSocket

- Route in `server/routes/ws.ts`
- Peer management in `server/utils/ws.ts`
- Client plugin in `app/plugins/websocket.client.ts`

---

## Known Issues

1. **No E2E Encryption:** Messages are stored and transmitted in plaintext.
2. **No Tests:** The project has zero test coverage.
3. **No Pagination for getConversations:** The conversation list loads all conversations at once. Could become slow with many conversations.

---

## Features Not Yet Implemented

- Group conversations
- Message search
- Typing indicators
- Image compression before upload
- End-to-end encryption
- Notifications (push or browser)
- Message editing
- Threads
- User profile editing

---

## Adding a New Feature

1. **Database:** Add a new migration function in `server/utils/db.ts`, call it from `initSchema()`
2. **API:** Create the route in `server/api/` following Nuxt file conventions
3. **Types:** Update `app/types/index.ts` if new data shapes are needed
4. **Component:** Add or modify components in `app/components/`
5. **WebSocket:** If real-time is needed, add event handlers in `server/routes/ws.ts` and `app/plugins/websocket.client.ts`
6. **Build:** Run `npm run build` before committing
