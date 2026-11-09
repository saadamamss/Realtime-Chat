# Firebase Migration Checklist

## Overview
Use this checklist to track the progress of your Firebase migration. Complete each item as you work through the phases.

## Status Summary (updated Nov 2026)

**Migration is functionally complete.** Key deviations from the original plan
(made during implementation, in favor of free-tier compatibility):

| Plan said | Actually done | Why |
|---|---|---|
| Firebase Auth (phone) | Kept existing phone-number + password JWT login, backed by Firestore | Firebase phone auth requires a paid plan |
| Firebase Storage | **Cloudinary** (free tier) | Firebase Storage requires a pricing-plan upgrade |
| Replace WebSocket with Firestore listeners | WebSocket retained on the server; Firestore listeners exist in `useRealtimeChat.ts` but the wired chat still uses WS | WS works, is already proven, and avoids Firestore read costs per keystroke |
| Singleton DB access | `server/lib/db-facade.ts` with `DB_MODE=sqlite\|firestore` | Lets both backends run side by side; simple rollback = flip env var |

Currently done (quick index):
- Data migrated: 5 users, 1 contact, 1 conversation, 2 participants, 20 messages (+ memberships mirror), 0 deletions — validation matched SQLite counts
- All 15+ server call sites switched to the async facade, smoke-tested in both modes
- Real-time via WebSocket verified end-to-end in Firestore mode (typing, delivery, read events, message-deleted broadcast)
- Files: new uploads go to Cloudinary in Firestore mode; all 17 existing local attachments migrated (`migrate-uploads-to-cloudinary.mjs`)
- One-off scripts: `migrate-sqlite-to-firestore.mjs`, `backfill-memberships.mjs`, `migrate-uploads-to-cloudinary.mjs`

## Phase 1: Preparation & Setup

### 1.1 Firebase Project Creation
- [x] Create Firebase project in Firebase Console (`chat-12380`)
- [x] ~~Enable Firebase Authentication~~ — n/a (custom JWT login retained; Firebase Auth console not needed)
- [x] Enable Firestore Database
- [ ] ~~Enable Firebase Storage~~ — replaced by Cloudinary (requires paid plan)
- [x] Configure project settings

### 1.2 Firebase SDK Installation
- [x] Install Firebase web SDK (client & server use the same app config)
- [x] ~~Install Firebase Admin SDK~~ — n/a, web SDK + Firestore rules open
- [x] Update package.json with dependencies (`firebase`)

### 1.3 Environment Configuration
- [x] Update `.env` / `.env.example` with `DB_MODE`, Cloudinary + Firebase variables
- [ ] Rotate the JWT secret before any real deployment (still `change-me…` note in `.env`)

### 1.4 Development Environment Setup
- [x] Test Firestore connectivity (`test-firestore-connection.mjs`)
- [x] Test Cloudinary connectivity (`test-with-image.mjs`)

## Phase 2: Schema Design & Migration Scripts

### 2.1 Schema Design
- [x] Design Firestore document structure (`users`, `conversations`, `participants/{convId}/participants/{uid}`, `messages`, `contacts/{uid}/contacts/{cid}`, `message_deletions/{rId}/deletions/{uid}`, plus `memberships` mirror)
- [x] Design indexes — deliberately index-free design: predicate-only queries + in-memory sort; top-level `memberships` collection instead of collection-group queries (which would need manual index exemptions)
- [ ] Firestore security rules — currently permissive; tighten before real deployment

### 2.2 Migration Scripts
- [x] Create SQLite to Firestore migration script (`migrate-sqlite-to-firestore.mjs`)
- [x] Batch processing + validation table
- [x] Membership mirror backfill (`backfill-memberships.mjs`)

## Phase 3: Backend Implementation

### 3.1 Database Layer Replacement
- [x] Firestore equivalents for all DB ops (`server/lib/db-firestore.ts`)
- [x] All API routes use the async facade (`server/lib/db-facade.ts`)
- [x] Response shape parity (ISO timestamps, sender enrichment, paging, no `password_hash` leaks)
- [x] Test all database operations (smoke tests SQLite + Firestore, e2e + WS tests)

### 3.2 Authentication Integration
- [x] ~~Replace JWT auth with Firebase Auth~~ — deliberately kept phone + password JWT (UX unchanged; phone auth is paywalled)
- [x] Auth middleware works against both backends via facade

### 3.3 File Storage Migration
- [x] ~~Firebase Storage~~ → **Cloudinary** for Firestore-mode uploads (server-side signed, `server/utils/cloudinary.ts`)
- [x] SQLite mode keeps local-disk storage (original behavior untouched)
- [x] Moved existing 17 files to Cloudinary (`migrate-uploads-to-cloudinary.mjs`, locals kept as backup)

### 3.4 Real-time Messaging System
- [x] WebSocket system retained and facade-safe (async-safe handlers)
- [x] Verified: new-message delivery, typing, message-deleted events, presence via WS in Firestore mode
- [x] Firestore real-time listeners exist (`composables/useRealtimeChat.ts`) — not wired into the live app (optional future step)

## Phase 4: Frontend Integration

### 4.1 Firebase SDK Integration
- [x] Firebase client SDK available in frontend
- [ ] Frontend currently talks only to the REST + WS API — no client-side Firebase calls required for the chat flow

### 4.2 Authentication Flow Update
- [x] No changes needed — phone/password login works identically in both modes

### 4.3 Not needed (WS path kept). `useRealtimeChat.ts` kept as an alternative if the Firestore-listener route is ever adopted.

### 4.4 UI/UX Updates
- [x] No UI changes required — API shapes match SQLite responses exactly

## Phase 5: Testing & Deployment

### 5.1 Comprehensive Testing
- [x] Smoke tests both modes (`/tmp/opencode/smoke-test.sh`, e2e-test.sh, ws-test.mjs)
- [ ] Automated CI tests (currently manual scripts)

### 5.3 Deployment Strategy
- [ ] For serverless deployment, remember `data/uploads` is only used by SQLite mode; Firestore mode stores files in Cloudinary
- [ ] Rollback = set `DB_MODE=sqlite` (SQLite data untouched during Firestore running)

## Post-Migration Tasks

### Data Integrity Verification
- [x] All migrated data verified against SQLite counts
- [x] CRUD + file upload/download flows tested in Firestore mode

### Documentation Updates
- [x] This checklist updated with actuals
- [ ] Create short troubleshooting note for `memberships` mirror (re-run `backfill-memberships.mjs` if conversations vanish)