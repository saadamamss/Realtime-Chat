import { defineWebSocketHandler } from 'h3'
import {
  registerPeer, unregisterPeer, identifyPeer,
  subscribeToConversation, unsubscribeFromConversation,
} from '../utils/ws'

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
      }
    } catch {
      // ignore invalid messages
    }
  },
  close(peer) {
    unregisterPeer(peer)
  },
})
