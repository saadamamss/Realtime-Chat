import { defineWebSocketHandler } from 'h3'
import {
  registerPeer, unregisterPeer, identifyPeer,
  subscribeToConversation, unsubscribeFromConversation, sendToUser,
} from '../utils/ws'
import { markRead, getConversationParticipantIds } from '../lib/db-facade'
import { verifyToken } from '../utils/auth'

export default defineWebSocketHandler({
  open(peer) {
    registerPeer(peer)
  },
  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const p = peer as any

      if (data.type === 'authenticate' && data.token) {
        verifyToken(data.token).then((payload) => {
          if (!payload) {
            peer.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
            peer.close()
            return
          }
          identifyPeer(peer, payload.userId)
        }).catch(() => {
          peer.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
          peer.close()
        })
        return
      }

      if (!p.userId) {
        peer.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }))
        return
      }

      if (data.type === 'join' && data.conversationId) {
        subscribeToConversation(peer, data.conversationId)
      } else if (data.type === 'leave' && data.conversationId) {
        unsubscribeFromConversation(peer, data.conversationId)
      } else if (data.type === 'messages-read' && data.conversation_id) {
        void (async () => {
          const count = await markRead(data.conversation_id, p.userId)
          if (count > 0) {
            const payload = JSON.stringify({
              type: 'read-update',
              conversation_id: data.conversation_id,
              user_id: p.userId,
            })
            const pIds = await getConversationParticipantIds(data.conversation_id)
            for (const pid of pIds) {
              if (pid !== p.userId) sendToUser(pid, payload)
            }
          }
        })().catch((err) => console.error('ws messages-read failed:', err))
      } else if (data.type === 'typing' && data.conversation_id) {
        void (async () => {
          const payload = JSON.stringify({
            type: 'typing',
            conversation_id: data.conversation_id,
            user_id: p.userId,
          })
          const pIds = await getConversationParticipantIds(data.conversation_id)
          for (const pid of pIds) {
            if (pid !== p.userId) sendToUser(pid, payload)
          }
        })().catch((err) => console.error('ws typing failed:', err))
      } else if (data.type === 'ping') {
        peer.send(JSON.stringify({ type: 'pong' }))
      }
    } catch {
      // ignore invalid messages
    }
  },
  close(peer) {
    unregisterPeer(peer)
  },
})
