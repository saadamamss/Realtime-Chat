---
name: codebase-observations
description: Architecture review notes and improvement areas for the chat app
metadata:
  type: reference
---

# Chat App — Codebase Observations (2026-06-14)

Overall: Solid foundation, well-executed for a self-contained chat app. Architecture is clean and pragmatic.

## What's Good

- **Tech choices are sensible.** Nuxt 4 + Nitro gives frontend and backend in one project. SQLite via better-sqlite3 is perfect for small-to-mid scale — zero ops overhead. WebSockets over raw h3 handles real-time without a heavy framework.
- **Code reads well.** Components are reasonably sized, separation between `server/utils/db.ts` (data layer), `server/utils/ws.ts` (presence/pubsub), and API routes is clear. TypeScript types are present where they matter.
- **Optimistic UI + pending message tracking** — messages show instantly, retry/cancel UX with progress circles is a nice touch many chat apps skip.
- **Sidebar resizing and responsive drawer** — pays attention to UX, not just functionality.
- **Migrations in code** (v1-v4 in `initSchema`). Simple and effective for SQLite.

## What's Rough

- **"Auth" isn't auth.** No password, no session token, no verification — just name + phone number in localStorage. Anyone who knows a phone number can impersonate that user. Fine for demo, not for production.
- **"Obayh" branding** scattered through components (`ObayhChat.vue`, `ObayhLogo2.vue`, `useObayhToast`) feels like a leftover brand. Consider renaming for consistency if that's not intentional.
- **No encryption.** Messages and files stored as plain text in SQLite, served over HTTP. No E2E, no TLS concern in dev — note if this goes beyond local/lan.
- **Error handling is inconsistent.** Some places show user-friendly toasts, others `console.error` silently. Login error uses `alert()` which is jarring.
- **No tests.** No test runner, no API tests, no component tests. Fine for personal project, but not production-ready without it.
- **`startRecording` catch block bug** (`app/components/ObayhChat.vue` line ~364-371) — if `getUserMedia` fails, it still sets `isRecording = true` and starts the timer, which would confuse users.

## Bottom Line

Genuinely good MVP / personal project. Feature set is impressive for the codebase size. If productizing, focus on: proper auth, error handling polish, test coverage, and renaming "Obayh" artifacts.
