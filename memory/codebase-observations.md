---
name: codebase-observations
description: Architecture review notes and improvement areas for the chat app
metadata:
  type: reference
---

# Chat App — Codebase Observations (Updated 2026-06-14)

Overall: Solid foundation, well-executed for a self-contained chat app. Architecture is clean and pragmatic.

## What's Good

- **Tech choices are sensible.** Nuxt 4 + Nitro gives frontend and backend in one project. SQLite via better-sqlite3 is perfect for small-to-mid scale — zero ops overhead. WebSockets over raw h3 handles real-time without a heavy framework.
- **Code reads well.** Components are reasonably sized, separation between `server/utils/db.ts` (data layer), `server/utils/ws.ts` (presence/pubsub), and API routes is clear. TypeScript types are present where they matter.
- **Optimistic UI + pending message tracking** — messages show instantly, retry/cancel UX with progress circles is a nice touch many chat apps skip.
- **Sidebar resizing and responsive drawer** — pays attention to UX, not just functionality.
- **Migrations in code** (v1-v7 via `initSchema`). Simple and effective for SQLite.
- **Message reply** — Banner preview + click-to-scroll, clean schema addition with `reply_to_rId`.
- **Delete messages** — "for me" (soft delete via `message_deletions` table) / "for all" (hard delete, sender only) with real-time WS sync.
- **Delivered/Read status** — Server-authoritative timestamps, WS events, graded icon states (✓ sent → ✓✓ delivered → ✓✓ blue read).
- **Unread message badges** — Server-side COUNT query, live increment via WS, clears on conversation open.

## Issues Fixed Since Initial Review

| Issue | Status |
|-------|--------|
| "Obayh" branding in filenames | ✅ **Fixed** — `ObayhChat.vue` → `ChatMessages.vue`, `ObayhLogo2.vue` → `ChatLogo.vue`, `useObayhToast.ts` → `useToast.ts` |
| `alert()` in login error | ✅ **Fixed** — uses `toast.error()` now |
| `console.error` silently in ChatLayout | ✅ **Fixed** — uses `toast.error()` for load/select/delete failures |
| `startRecording` catch-block bug | ✅ **Fixed** — shows `toast.error()` about mic permissions instead of pretending recording started |
| `$ws.offMessage` missing in ChatMessages unmount | ✅ **Fixed** — added in `onUnmounted` to prevent memory leaks |
| `useObayhToast()` leftover call in ChatMessages.vue:241 | ✅ **Fixed** — replaced with `useToast()` |

## Remaining Issues

### 🔴 Auth isn't auth
No password, no session token, no verification — just name + phone number in localStorage. Anyone who knows a phone number can impersonate that user. Fine for demo, not for production.

### 🔴 No encryption
Messages and files stored as plain text in SQLite, served over HTTP. No E2E, no TLS.

### 🟡 No tests
No test runner, no API tests, no component tests. Fine for personal project, but not production-ready without it.

## Features Added Since Initial Review

| Feature | Details |
|---------|---------|
| Delete messages | "For me" + "For all" with WS sync (`server/api/messages/delete.post.ts`) |
| Message reply | Reply banner, preview in bubble, scroll-to-original (`reply_to_rId` schema) |
| Delivered/Read status | Server timestamps, WS events, ✓→✓✓→✓✓(blue) icons |
| Unread badges | Server COUNT, sidebar badge, live increment, clears on open |
| Logout button | Added to empty state / welcome page as well |

## Bottom Line

Genuinely good MVP / personal project. Feature set is impressive for the codebase size. The rename/error-handling polish shows attention to quality. One small leftover bug to fix (`useObayhToast` → `useToast`), and the remaining open issues are architectural (auth, encryption, tests).
