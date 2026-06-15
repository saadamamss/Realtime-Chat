# Database Schema & Migrations

The database is a single SQLite file at `data/chat.db`. It uses WAL journal mode and foreign keys.

---

## Schema

### `users`

| Column         | Type    | Constraints                    |
|----------------|---------|--------------------------------|
| `id`           | TEXT    | PRIMARY KEY                    |
| `username`     | TEXT    | NOT NULL                       |
| `phone_number` | TEXT    | UNIQUE (added in migrateV1)    |
| `avatar`       | TEXT    |                                |
| `created_at`   | TEXT    | DEFAULT datetime('now')        |

**Index:** `idx_users_phone` on `phone_number`.

### `contacts`

| Column       | Type | Constraints                                       |
|--------------|------|---------------------------------------------------|
| `user_id`    | TEXT | NOT NULL, PK, FK → users(id)                      |
| `contact_id` | TEXT | NOT NULL, PK, FK → users(id)                      |
| `created_at` | TEXT | DEFAULT datetime('now')                           |

**PK:** `(user_id, contact_id)`

### `conversations`

| Column       | Type    | Constraints                    |
|--------------|---------|--------------------------------|
| `id`         | TEXT    | PRIMARY KEY                    |
| `name`       | TEXT    |                                |
| `created_by` | TEXT    | (added in migrateV2)           |
| `created_at` | TEXT    | DEFAULT datetime('now')        |

### `conversation_participants`

| Column            | Type    | Constraints                            |
|-------------------|---------|----------------------------------------|
| `conversation_id` | TEXT    | NOT NULL, PK, FK → conversations(id)   |
| `user_id`         | TEXT    | NOT NULL, PK, FK → users(id)           |
| `hidden`          | INTEGER | DEFAULT 0 (added in migrateV3)         |
| `deleted_at`      | TEXT    | (added in migrateV4)                   |

**PK:** `(conversation_id, user_id)`

### `messages`

| Column            | Type    | Constraints                            |
|-------------------|---------|----------------------------------------|
| `id`              | INTEGER | PRIMARY KEY AUTOINCREMENT              |
| `rId`             | TEXT    | UNIQUE NOT NULL                        |
| `sender_id`       | TEXT    | NOT NULL, FK → users(id)               |
| `conversation_id` | TEXT    | NOT NULL, FK → conversations(id)       |
| `content`         | TEXT    | DEFAULT ''                             |
| `file_url`        | TEXT    | DEFAULT ''                             |
| `file_extension`  | TEXT    | DEFAULT ''                             |
| `file_size`       | INTEGER |                                        |
| `read_at`         | TEXT    | (added in migrateV7)                   |
| `delivered_at`    | TEXT    | (added in migrateV7)                   |
| `reply_to_rId`    | TEXT    | (added in migrateV6)                   |
| `created_at`      | TEXT    | DEFAULT datetime('now')                |

**Indexes:**
- `idx_messages_conv` ON `(conversation_id, created_at)`
- `idx_messages_rId` ON `(rId)`

### `message_deletions`

| Column         | Type    | Constraints                            |
|----------------|---------|----------------------------------------|
| `message_rId`  | TEXT    | NOT NULL, PK, FK → messages(rId)       |
| `user_id`      | TEXT    | NOT NULL, PK, FK → users(id)           |
| `created_at`   | TEXT    | DEFAULT datetime('now')                |

**PK:** `(message_rId, user_id)`

---

## Migrations

Migrations run in order on `initSchema()`. Each migration is idempotent (uses `ALTER TABLE ADD COLUMN` with IF NOT NULL checks, or `CREATE TABLE IF NOT EXISTS`).

| Migration | Description                                   |
|-----------|-----------------------------------------------|
| `migrateV1` | Add `phone_number` column to `users`        |
| `migrateV2` | Add `created_by` column to `conversations`  |
| `migrateV3` | Add `hidden` column to `conversation_participants` |
| `migrateV4` | Add `deleted_at` column to `conversation_participants` |
| `migrateV5` | Create `message_deletions` table            |
| `migrateV6` | Add `reply_to_rId` column to `messages`     |
| `migrateV7` | Add `delivered_at` column to `messages`     |

**Note:** When developing, if you change the schema, delete `data/chat.db*` files so the DB is recreated from scratch.

---

## Key Queries

### Get Conversations (per user)

```sql
SELECT c.id, c.name, c.created_at,
  (SELECT content FROM messages WHERE conversation_id = c.id
   ORDER BY created_at DESC LIMIT 1) as last_message,
  (SELECT created_at FROM messages WHERE conversation_id = c.id
   ORDER BY created_at DESC LIMIT 1) as last_message_at,
  (SELECT COUNT(*) FROM messages m
   WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read_at IS NULL) as unread_count,
  (SELECT json_object('id', u.id, 'name', u.username, 'phone_number', u.phone_number, 'image', u.avatar)
   FROM conversation_participants cp2 JOIN users u ON cp2.user_id = u.id
   WHERE cp2.conversation_id = c.id AND cp2.user_id != ? LIMIT 1) as other_participant
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
WHERE cp.hidden = 0
  AND (EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id) OR c.created_by = ?)
ORDER BY last_message_at DESC
```

### Get Messages (paginated, per user)

```sql
SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
FROM messages m
JOIN users u ON m.sender_id = u.id
LEFT JOIN conversation_participants cp
  ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
LEFT JOIN message_deletions md
  ON md.message_rId = m.rId AND md.user_id = ?
WHERE m.conversation_id = ?
  AND (cp.deleted_at IS NULL OR m.created_at > cp.deleted_at)
  AND md.user_id IS NULL
ORDER BY m.created_at DESC
LIMIT ? OFFSET ?
```

### Mark Read

```sql
UPDATE messages SET read_at = datetime('now')
WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL
```

### Mark Delivered

```sql
UPDATE messages SET delivered_at = datetime('now')
WHERE rId = ? AND delivered_at IS NULL
```

### Delete Message (soft)

```sql
INSERT INTO message_deletions (message_rId, user_id) VALUES (?, ?)
```

### Delete Message (hard)

```sql
DELETE FROM messages WHERE rId = ? AND sender_id = ?
```

### Wipe Conversation

```sql
UPDATE conversation_participants
SET deleted_at = datetime('now')
WHERE conversation_id = ? AND user_id = ?
```

### Soft-Delete Conversation

```sql
UPDATE conversation_participants
SET hidden = 1, deleted_at = datetime('now')
WHERE conversation_id = ? AND user_id = ?
```

---

## Seed Data

On first run (empty `users` table), three demo users are seeded:

| Username | Phone          | Avatar Background |
|----------|----------------|-------------------|
| Alice    | `+1-555-0101`  | `#2563eb` (blue)  |
| Bob      | `+1-555-0102`  | `#7c3aed` (purple)|
| Charlie  | `+1-555-0103`  | `#059669` (green) |

Avatars are generated via DiceBear initials API:
```
https://api.dicebear.com/9.x/initials/svg?seed={username}&background={color}
```

---

## Per-User Soft Delete Model

Two independent mechanisms control message visibility per user:

1. **`conversation_participants.hidden`** — When set to `1`, the conversation is excluded from `getConversations`. Set on soft-delete, reset to `0` on re-entry.

2. **`conversation_participants.deleted_at`** — When set, messages created BEFORE this timestamp are excluded from `getMessages`. This allows a user to "wipe" a conversation without affecting the other user's view. Unlike `hidden`, the conversation stays visible if `hidden = 0`.

3. **`message_deletions`** — Per-user, per-message soft-delete. A message is excluded from `getMessages` for a user if their `user_id` appears in this table for that message's `rId`.
