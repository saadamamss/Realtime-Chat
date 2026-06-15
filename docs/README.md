# Chat App

A real-time chat application built with **Nuxt 4**, **Vue 3**, **Nitro**, **SQLite** (`better-sqlite3`), and **WebSockets** (crossws). Features include presence, contact management, file sharing, voice recording, message reply/delete, read receipts, delivery status, and optimistic UI.

---

## Quick Start

```bash
npm install
npm run dev
```

The app starts a dev server (default `http://localhost:3000`).

### Seed Users

| Username  | Phone          |
|-----------|----------------|
| Alice     | `+1-555-0101`  |
| Bob       | `+1-555-0102`  |
| Charlie   | `+1-555-0103`  |

Login with any of these (username + phone number) to start chatting.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | Nuxt 4 (SPA mode, SSR disabled)   |
| Frontend       | Vue 3 + TypeScript                |
| UI Library     | Nuxt UI (Tailwind CSS v4)         |
| Icons          | Phosphor + Heroicons (Iconify)    |
| HTTP Client    | Axios                             |
| Server Engine  | Nitro (Node.js)                   |
| Database       | SQLite via `better-sqlite3`       |
| Real-Time      | WebSocket (crossws, Nitro built-in) |
| Auth           | Custom (username + phone, no passwords) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              app.vue (Login/Root)             │   │
│  │         ┌─────────────────────────────┐       │   │
│  │         │       ChatLayout.vue        │       │   │
│  │         │  ┌─────────┐ ┌───────────┐ │       │   │
│  │         │  │ Sidebar │ │ ChatMessages │   │       │   │
│  │         │  │ (chats, │ │ (messages)│ │       │   │
│  │         │  │contacts,│ │           │ │       │   │
│  │         │  │  add)   │ │ ChatMsg   │ │       │   │
│  │         │  └─────────┘ │ Card .vue │ │       │   │
│  │         │              └───────────┘ │       │   │
│  │         └─────────────────────────────┘       │   │
│  └──────────────────────────────────────────────┘   │
│         │ HTTP (Axios)          │ WebSocket          │
└─────────┼───────────────────────┼───────────────────┘
          │                       │
┌─────────┼───────────────────────┼───────────────────┐
│  Nitro  │                       │                    │
│  ┌──────▼───────────────────────▼──────────────┐    │
│  │          API Routes + WebSocket             │    │
│  │  POST /api/auth/login     ws://host/ws      │    │
│  │  GET  /api/conversations                     │    │
│  │  POST /api/conversations                     │    │
│  │  DELETE /api/conversations                   │    │
│  │  POST /api/conversations/wipe                │    │
│  │  GET  /api/messages                          │    │
│  │  POST /api/messages                          │    │
│  │  POST /api/messages/delete                   │    │
│  │  GET  /api/contacts                          │    │
│  │  POST /api/contacts                          │    │
│  │  DELETE /api/contacts                        │    │
│  └──────────────────────────────────────────────┘    │
│           │                                          │
│  ┌────────▼──────────────────────────────────────┐   │
│  │              server/utils/db.ts               │   │
│  │     SQLite (data/chat.db) + better-sqlite3    │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Documentation Index

| Document            | Description                            |
|---------------------|----------------------------------------|
| `architecture.md`   | High-level architecture & data flow    |
| `api.md`            | REST API endpoint reference            |
| `database.md`       | Database schema, migrations, queries   |
| `websocket.md`      | WebSocket protocol, events, presence   |
| `features.md`       | Feature reference (all functionality)  |
| `development.md`    | Build, conventions, known issues       |

---

## Key Decisions

- **SSR disabled** — fully client-side rendered SPA.
- **SQLite** — zero-config persistence, database stored at `data/chat.db`.
- **WebSocket (crossws)** — Nitro built-in WebSocket, not SSE or Socket.IO.
- **One-directional contacts** — adding someone as a contact is unilateral (they must add you back).
- **Per-user soft delete** — `hidden` + `deleted_at` columns allow independent conversation/message visibility.
- **Optimistic UI** — messages appear instantly before server confirms.
- **Auth by header** — `x-user-id` header identifies the user (no passwords/tokens).
