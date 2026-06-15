# REST API Reference

All endpoints are prefixed with `/api`. User identification is done via the `x-user-id` header (set automatically by the auth plugin after login).

---

## Auth

### `POST /api/auth/login`

Login or register a user.

**Request Body:**
```json
{
  "username": "Alice",
  "phone_number": "+1-555-0101"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "username": "Alice",
    "phone_number": "+1-555-0101",
    "avatar": "https://api.dicebear.com/9.x/initials/svg?seed=Alice&background=%232563eb"
  }
}
```

**Errors:** `400` if username or phone_number missing/invalid.

**Logic:** `findOrCreateUser()` — looks up by `phone_number`, updates `username` if exists, creates new user if not.

---

## Conversations

### `GET /api/conversations`

List the current user's conversations.

**Headers:** `x-user-id` (required)

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "name": "dm:aliceId:bobId",
      "created_at": "2025-06-15T12:00:00.000Z",
      "last_message": "Hey, how are you?",
      "last_message_at": "2025-06-15T12:05:00.000Z",
      "unread_count": 3,
      "other_participant": {
        "id": "uuid",
        "name": "Alice",
        "phone_number": "+1-555-0101",
        "image": "https://api.dicebear.com/9.x/initials/svg?seed=Alice&background=%232563eb"
      }
    }
  ]
}
```

**Errors:** `401` if `x-user-id` missing.

**Logic:** Returns only conversations where `hidden = 0` AND (has at least one message OR `created_by = userId`). Includes `unread_count` subquery counting inbound messages where `read_at IS NULL`.

---

### `POST /api/conversations`

Create or get a DM conversation with another user.

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "contact_id": "target-user-uuid"
}
```

**Response (200/201):**
```json
{
  "conversation": {
    "id": "uuid",
    "name": "dm:user1Id:user2Id"
  }
}
```

**Errors:** `401` no user ID, `400` missing `contact_id`.

**Logic:** Calls `getOrCreateDMConversation(userId, contact_id, userId)`. The `name` is stored as `dm:{sortedId1}:{sortedId2}`. Creates the conversation and adds both participants. If conversation already exists, re-adds participant (sets `hidden = 0`).

---

### `DELETE /api/conversations`

Soft-delete a conversation (hide for current user only).

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "conversation_id": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:** `401` no user, `400` missing `conversation_id`, `403` not a participant.

**Logic:** Sets `hidden = 1` AND `deleted_at = datetime('now')` on the participant record. Does NOT affect the other user's view.

---

### `POST /api/conversations/wipe`

Wipe conversation (hide old messages for current user).

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "conversation_id": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:** Same as delete.

**Logic:** Sets `deleted_at = datetime('now')` on the participant record. The conversation stays visible but messages created before the wipe are hidden (`getMessages` filters by `created_at > deleted_at`). Unlike delete, does NOT set `hidden = 1`.

---

## Contacts

### `GET /api/contacts`

List the current user's contacts.

**Headers:** `x-user-id` (required)

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "name": "Bob",
      "phone_number": "+1-555-0102",
      "image": "https://api.dicebear.com/..."
    }
  ]
}
```

**Logic:** One-directional — only returns contacts this user has added.

---

### `POST /api/contacts`

Add a contact by phone number.

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "phone_number": "+1-555-0102"
}
```

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "Bob",
    "phone_number": "+1-555-0102",
    "image": "https://api.dicebear.com/..."
  }
}
```

**Errors:** `400` missing phone, `404` user not found, `404` cannot add self.

**Logic:** Finds user by `phone_number`. Uses `INSERT OR IGNORE` so duplicate adds are silently handled.

---

### `DELETE /api/contacts`

Remove a contact.

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "contact_id": "uuid"
}
```

**Response:**
```json
{
  "success": true
}
```

**Errors:** `404` if contact not found.

**Logic:** Deletes from `contacts` table where `user_id = userId AND contact_id = contactId`.

---

## Messages

### `GET /api/messages`

Get paginated messages for a conversation.

**Headers:** `x-user-id` (required)

**Query Parameters:**

| Param            | Type   | Default | Description                    |
|------------------|--------|---------|--------------------------------|
| `conversation_id`| string | —       | Target conversation ID (required) |
| `page`           | number | 1       | Page number (15 per page)      |

**Response:**
```json
{
  "data": {
    "2025-06-15": [
      {
        "rId": "msg_uuid",
        "id": 42,
        "sender": { "id": "uuid", "name": "Alice", "image": "..." },
        "content": "Hello!",
        "file": "/uploads/file-uuid.pdf",
        "file_extension": "pdf",
        "file_size": 1024,
        "reply_to": {
          "rId": "msg_uuid",
          "sender": { "id": "uuid", "name": "Bob" },
          "content": "Original message"
        },
        "delivered_at": "2025-06-15T12:00:00.000Z",
        "read_at": null,
        "created_at": "2025-06-15T12:00:00.000Z",
        "created_at_time": "12:00",
        "status": "sent"
      }
    ]
  },
  "last_page": 5,
  "total": 72
}
```

**Logic:**
- Returns messages in chronological order, grouped by date
- Excludes messages deleted by the user (`message_deletions` table)
- Excludes messages created before participant's `deleted_at` (for wiped conversations)
- Batch-fetches `reply_to_rId` targets and attaches `reply_to` data
- Messages ordered by `created_at DESC` then reversed for chronological grouping

---

### `POST /api/messages`

Send a message with optional file attachment.

**Headers:** `x-user-id` (required)

**Request Body:** `multipart/form-data`

| Field              | Type   | Required | Description                         |
|--------------------|--------|----------|-------------------------------------|
| `conversation_id`  | string | yes      | Target conversation                 |
| `content`          | string | no       | Message text                        |
| `sender_name`      | string | no       | Display name                        |
| `sender_avatar`    | string | no       | Avatar URL                          |
| `rId`              | string | no       | Client-generated temp ID            |
| `reply_to_rId`     | string | no       | rId of message being replied to     |
| `file`             | file   | no       | File attachment (max 2MB)           |
| `file_extension`   | string | no       | Override file extension             |
| `file_size`        | number | no       | File size in bytes                  |

**Response (201):**
```json
{
  "message": { "rId": "msg_uuid", ... }
}
```

**Server-side logic:**
1. Parse multipart form data
2. If file provided, save to `public/uploads/{uuid}{ext}`
3. `addParticipant()` ensures sender is in conversation
4. `createMessage()` inserts the message row
5. If `reply_to_rId`, fetch the original message for `reply_to` data
6. Broadcast `{ type: 'new-message', message, conversation_id }` via WebSocket to all conversation subscribers
7. If any other participant is subscribed to the conversation, mark the message as delivered immediately and send `delivery-update` to the sender

---

### `POST /api/messages/delete`

Delete a message (for self or for all).

**Headers:** `x-user-id` (required)

**Request Body:**
```json
{
  "message_id": "msg_uuid",
  "mode": "me"
}
```

**Mode values:**
- `'me'` — Soft-delete for current user only (INSERT into `message_deletions`)
- `'all'` — Hard-delete (DELETE from messages). Only the original sender is authorized.

**Response:**
```json
{
  "success": true
}
```

**Logic:**
- `'me'`: Inserts into `message_deletions` table. The message is hidden in `getMessages` via `LEFT JOIN`.
- `'all'`: Hard-deletes the message row. Broadcasts `{ type: 'message-deleted', message_id, conversation_id }` via WebSocket to all other participants so they remove it from their UI.

**Errors:** `400` if `message_id` or `mode` missing/invalid; `404` if message not found or not authorized.

---

## Users

### `GET /api/users`

List all registered users.

**Response:**
```json
{
  "users": [
    { "id": "uuid", "name": "Alice", "phone_number": "+1-555-0101", "image": "..." }
  ]
}
```

**Logic:** Returns all users ordered by username. No auth required (used during registration/contact lookup).
