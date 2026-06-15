# WebSocket Protocol

The WebSocket endpoint is `ws://{host}/ws` (or `wss://` in production). It uses Nitro's built-in crossws implementation.

---

## Connection Lifecycle

```
Client connects         →  Server registers peer (allPeers)
  └─ send identify      →  Server associates peer with userId, broadcasts user-online
  └─ send join          →  Server subscribes to conversation topic

User disconnects        →  Server broadcasts user-offline, removes from all maps
```

---

## Client → Server Messages

### `identify`

Sent immediately after connection to associate the WebSocket connection with a user.

```json
{ "type": "identify", "userId": "uuid" }
```

**Server action:**
- Associates peer with userId in `userIdByPeer` and `peerByUserId`
- If user was already connected from another tab, closes old peer
- Sends `presence-snapshot` to the newly connected peer (list of all currently online user IDs)
- Broadcasts `{ type: 'user-online', userId }` to all other connected peers

### `join`

Subscribe to a conversation topic (to receive real-time messages).

```json
{ "type": "join", "conversationId": "uuid" }
```

**Server action:** Calls `peer.subscribe(conversationId)` on the crossws peer.

### `leave`

Unsubscribe from a conversation topic.

```json
{ "type": "leave", "conversationId": "uuid" }
```

**Server action:** Calls `peer.unsubscribe(conversationId)`.

### `messages-read`

Mark all inbound messages in a conversation as read.

```json
{ "type": "messages-read", "conversation_id": "uuid" }
```

**Server action:**
1. Calls `markRead(conversation_id, peer.userId)` — stamps `read_at` on all messages where `sender_id ≠ userId` and `read_at IS NULL`
2. If any rows were updated, broadcasts to all participants of that conversation:
   ```json
   { "type": "read-update", "conversation_id": "uuid", "user_id": "uuid" }
   ```
   Note: The `read-update` is broadcast to ALL participants including the sender (for their outbound messages to be marked as read).

---

## Server → Client Messages

### `presence-snapshot`

Sent to a peer after they `identify`. Contains the full list of online user IDs.

```json
{
  "type": "presence-snapshot",
  "onlineUsers": ["uuid1", "uuid2", "uuid3"]
}
```

### `user-online`

Broadcast when a user connects.

```json
{ "type": "user-online", "userId": "uuid" }
```

### `user-offline`

Broadcast when a user disconnects.

```json
{ "type": "user-offline", "userId": "uuid" }
```

### `new-message`

Broadcast to all conversation subscribers when a message is sent.

```json
{
  "type": "new-message",
  "message": { /* full ChatMessage object */ },
  "conversation_id": "uuid"
}
```

The sender also receives this broadcast. The client uses the `rId` field to match it against pending optimistic messages and replace the temp data with confirmed server data.

### `delivery-update`

Sent only to the sender when a recipient is confirmed online and subscribed to the conversation.

```json
{ "type": "delivery-update", "message_id": "msg_uuid" }
```

**Logic:** Triggered inside `POST /api/messages`. After inserting the message, the server checks `isUserSubscribed(recipientId, conversationId)`. If the recipient's peer has the conversation in its `topics` set, the message is marked as delivered and this event is sent to the sender.

### `read-update`

Broadcast to all conversation participants when someone marks messages as read.

```json
{
  "type": "read-update",
  "conversation_id": "uuid",
  "user_id": "uuid"
}
```

**Client handling:** Only processed if `conversation_id` matches the currently open conversation. Stamps `read_at` on all OUTBOUND messages (where `sender.id === currentUser.id` and `read_at` is null). This updates the status icons from "delivered" (gray ✓✓) to "read" (blue ✓✓).

### `message-deleted`

Broadcast when a message is hard-deleted (mode `'all'`).

```json
{
  "type": "message-deleted",
  "message_id": "msg_uuid",
  "conversation_id": "uuid"
}
```

**Client handling:** Removes the message from `chatData` by its `rId`.

---

## Peer Tracking (server/utils/ws.ts)

### Data Structures

| Structure        | Type                  | Purpose                        |
|------------------|-----------------------|--------------------------------|
| `allPeers`       | `Set<peer>`           | All connected peers            |
| `userIdByPeer`   | `Map<peer, string>`   | Peer → userId lookup           |
| `peerByUserId`   | `Map<string, peer>`   | userId → peer lookup           |

### Functions

| Function                          | Purpose                                   |
|-----------------------------------|-------------------------------------------|
| `registerPeer(peer)`              | Add peer to global set                    |
| `unregisterPeer(peer)`            | Remove peer, broadcast user-offline       |
| `identifyPeer(peer, userId)`      | Associate peer with userId                |
| `isUserOnline(userId)`            | Check if user has active connection       |
| `subscribeToConversation(peer, id)`| Subscribe to topic                       |
| `unsubscribeFromConversation(peer, id)`| Unsubscribe from topic              |
| `broadcastToConversation(id, msg)`| Send msg to all topic subscribers         |
| `isUserSubscribed(userId, id)`    | Check if user's peer is in topic          |
| `sendToUser(userId, msg)`         | Send direct message to user's peer        |

### Client-Side Usage

The WebSocket client (`app/plugins/websocket.client.ts`) provides:

```ts
const $ws = useNuxtApp().$ws

// Reactive state
$ws.connected        // boolean — connection status
$ws.onlineUsers      // Set<string> — online user IDs

// Methods
$ws.connect(userId?)                // Connect and identify
$ws.send(data)                      // Send JSON message
$ws.onMessage(callback)             // Register message handler
$ws.offMessage(callback)            // Unregister handler
$ws.joinConversation(id)            // Subscribe to conversation
$ws.leaveConversation(id)           // Unsubscribe
$ws.isOnline(userId)                // Check online status
```

**Key behavior:**
- Auto-reconnects after 3 seconds on disconnect
- Sends heartbeat (`{ type: 'ping' }`) every 30 seconds
- Supports multiple message handlers via a `Set<callback>`
- `onMessage` / `offMessage` pattern ensures proper cleanup on unmount
