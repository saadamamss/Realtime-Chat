import { defineWebSocketHandler } from 'h3'
import {
  registerPeer, unregisterPeer, identifyPeer,
  subscribeToConversation, unsubscribeFromConversation, sendToUser,
} from '../utils/ws'
import { markRead, getConversationParticipantIds } from '../utils/db'

export default defineWebSocketHandler({
  open(peer) {
    registerPeer(peer)
  },
  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      if (data.type === 'identify' && data.userId) {
        identifyPeer(peer, data.userId)
      } else if (data.type === 'join' && data.conversationId) {
        subscribeToConversation(peer, data.conversationId)
      } else if (data.type === 'leave' && data.conversationId) {
        unsubscribeFromConversation(peer, data.conversationId)
      } else if (data.type === 'messages-read' && data.conversation_id && peer.userId) {
        const count = markRead(data.conversation_id, peer.userId)
        if (count > 0) {
          const payload = JSON.stringify({
            type: 'read-update',
            conversation_id: data.conversation_id,
            user_id: peer.userId,
          })
          const pIds = getConversationParticipantIds(data.conversation_id)
          for (const pid of pIds) {
            if (pid !== peer.userId) {
              sendToUser(pid, payload)
            }
          }
        }
      }
    } catch {
      // ignore invalid messages
    }
  },
  close(peer) {
    unregisterPeer(peer)
  },
})
