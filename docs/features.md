# Features Reference

---

## 1. Authentication

- **Login** with username + phone number (`POST /api/auth/login`)
- No passwords, tokens, or sessions — user identified by `x-user-id` header
- User restored from `localStorage('chat_user')` on page reload
- Login form with loading state while auth request is in flight

---

## 2. Presence

- **Online/Offline indicators** — green dot on avatars when user is connected
- Real-time via WebSocket: `user-online` and `user-offline` events
- `presence-snapshot` sent on connect with full list of online users
- Single active connection per user (new connection replaces old one)
- Presence is conversation-aware (sidebar shows online status for each conversation partner)

---

## 3. Contacts

- **One-directional** — adding a contact by phone number only affects the adder's view
- The other user must add you back for mutual visibility
- Add via phone number from sidebar (pencil icon → "Add New Contact")
- Add from conversation context menu (right-click or "..." button on chat item)
- Remove contact from contact picker (x button on contact row)
- Display names: if user is in contacts, show contact name; otherwise show phone number
- Contacts persisted in `contacts` table (user_id → contact_id)

---

## 4. Conversations

- **Direct Message (DM)** — created by selecting a contact or adding a new contact
- Automatic DM creation when sending first message to a non-contact
- Conversation names stored as `dm:{sortedId1}:{sortedId2}`
- Sorted by most recent message (newest first)
- Only conversations with messages OR created by you are shown
- Context menu: "Add to Contact", "Wipe Conversation", "Delete Conversation"
- **Delete Conversation** — hides conversation for current user only (`hidden=1`, `deleted_at=now`)
- **Wipe Conversation** — hides old messages but keeps conversation visible (`deleted_at=now` only)

---

## 5. Real-Time Messaging

- WebSocket-based, no polling
- Messages broadcast to all conversation participants
- Sender receives their own broadcast (replaces optimistic message with server data)
- New messages auto-scroll to bottom
- Messages loaded in pages of 15, with infinite scroll (load older on scroll to top))

---

## 6. Message Reply

- Reply to any message via "..." context menu → "Reply"
- Shows a colored bar above the input area with "Replying to [name]" and message preview
- Reply preview block inside the message bubble (colored bar + sender name + truncated content)
- Clicking the reply preview block scrolls to the original message (`scrollIntoView`)
- `reply_to_rId` stored in `messages` table
- Server batch-fetches all reply targets for paginated message queries

---

## 7. Message Status

Three states displayed as icons:

| State     | Icon              | Color     | Description                            |
|-----------|-------------------|-----------|----------------------------------------|
| Sent      | Single check ✓    | Gray      | Message sent to server                 |
| Delivered | Double check ✓✓   | Gray      | Recipient is online and subscribed     |
| Read      | Double check ✓✓   | Blue      | Recipient has read the message         |

**Delivery:** When a message is sent, the server checks if any other participant has a WebSocket connection subscribed to the conversation. If yes, `delivered_at` is stamped immediately and a `delivery-update` WS event is sent to the sender.

**Read receipt:** When a user opens a conversation or receives a new inbound message, the client sends `messages-read` via WS. The server stamps `read_at` on all inbound messages and broadcasts `read-update` to participants.

---

## 8. Unread Badge

- **In sidebar**: Red rounded pill with white number (capped at "99+") on each conversation item
- Counted server-side via `unread_count` subquery in `getConversations()`
- Incremented in real-time on `new-message` WS when NOT viewing that conversation
- Cleared when conversation is selected (read ack sent)
- **In chat view**: Red "X unread messages" badge rendered between read and unread messages
- Shows the count of messages that arrived while the conversation was closed
- Badge is positioned at the boundary between read and unread (chronological)
- Persists until user sends a message or receives a new message

---

## 9. File Sharing

Supported file types:

| Category   | Formats                                              |
|------------|------------------------------------------------------|
| Images     | jpg, jpeg, png, gif, webp, svg, bmp                  |
| Videos     | mp4, avi, mov, wmv, flv, webm, mkv                   |
| Audio      | mp3, wav, ogg, m4a, aac, flac                         |
| Documents  | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip, rar   |

- Max file size: **2MB** (validated client-side)
- Files saved to `public/uploads/{uuid}{ext}` on server
- Attach menu with categorized selection (Documents / Voice / Audio / Photos)
- Upload progress bar via Axios `onUploadProgress`
- Cancel in-progress uploads via `AbortController`
- Retry failed uploads

---

## 10. Voice Recording

- Built-in voice recorder using `MediaRecorder` API
- Records to WAV format
- Recording indicator with animated dot, timer
- Stop button to finish recording and attach as file
- Menu option: Attach → Voice

---

## 11. Message Deletion

Two modes:

| Mode  | Description                      | Authorization               |
|-------|----------------------------------|-----------------------------|
| `me`  | Removes message from your view   | Any participant             |
| `all` | Removes message for everyone     | Only the original sender    |

- Delete dialog with radio buttons (centered modal)
- `'me'` mode: Inserts into `message_deletions` table (soft-delete per user)
- `'all'` mode: Hard-deletes from `messages` table
- On `'all'`: broadcasts `message-deleted` WS event to other participants

---

## 12. Optimistic Messages

- Messages appear instantly with `status: 'sending'`
- Temp `rId` generated client-side (`msg_{timestamp}_{random}`)
- Matched with server response via `rId` on WS `new-message` event
- Status transitions: `sending` → `sent` → (delivery-update) → (read-update)
- Failed messages show warning icon with retry button
- Upload progress tracked per pending message

---

## 13. Sidebar

Three views managed by `sidebarView` ref:

| View           | Description                              |
|----------------|------------------------------------------|
| `chats`        | Conversation list with search, badges    |
| `contacts`     | Contact list, add/remove                 |
| `add-contact`  | Phone number input form                   |

- **Resizable** — drag handle to adjust width (stored in `localStorage('sidebar_width')`)
- **Responsive drawer** — activates when `window.innerWidth < 760px`
- Slides in from left with overlay backdrop
- Hamburger button toggles drawer
- Closes automatically on conversation select

---

## 14. Welcome / Empty State

- Centered gradient banner with icon and welcome text when no conversation is selected
- Top bar hidden for clean look
- Drawer toggle button in top-left corner
- Logout button on the welcome page for convenience

---

## 15. Input Area

- Blue color scheme (blue-50 textarea, blue-600 send button)
- Thick blue top border
- **Auto-growing textarea** — grows as user types, max 240px then scrolls
- **Enter** sends, **Shift+Enter** inserts newline
- Send button and attach button share same height as textarea (`items-stretch`)
- File preview bar between input area and messages
- Recording bar when recording voice

---

## 16. Responsive Design

- Sidebar + chat area side-by-side on wide screens
- Sidebar becomes drawer overlay on screens < 760px
- Breakpoint calculation: `sidebar_min(260) + chat_min(500) = 760`
- Sidebar width persists across sessions via localStorage

---

## 17. Seed Users

Pre-populated on first database initialization:

| Username | Phone          |
|----------|----------------|
| Alice    | `+1-555-0101` |
| Bob      | `+1-555-0102` |
| Charlie  | `+1-555-0103` |
