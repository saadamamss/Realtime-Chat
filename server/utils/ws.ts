let allPeers: Set<any> = new Set()
const userIdByPeer = new Map<any, string>()
const peerByUserId = new Map<string, any>()

export function registerPeer(peer: any) {
  allPeers.add(peer)
}

export function unregisterPeer(peer: any) {
  allPeers.delete(peer)
  const userId = userIdByPeer.get(peer)
  if (userId) {
    userIdByPeer.delete(peer)
    peerByUserId.delete(userId)
    broadcastToAll(JSON.stringify({ type: 'user-offline', userId }))
  }
}

export function identifyPeer(peer: any, userId: string) {
  const prev = peerByUserId.get(userId)
  if (prev && prev !== peer) {
    unregisterPeer(prev)
  }
  userIdByPeer.set(peer, userId)
  peerByUserId.set(userId, peer)

  const onlineIds = [...peerByUserId.keys()].filter(id => id !== userId)
  peer.send(JSON.stringify({ type: 'presence-snapshot', userIds: onlineIds }))

  broadcastToAll(JSON.stringify({ type: 'user-online', userId }))
}

export function isUserOnline(userId: string) {
  return peerByUserId.has(userId)
}

export function subscribeToConversation(peer: any, conversationId: string) {
  peer.subscribe(conversationId)
}

export function unsubscribeFromConversation(peer: any, conversationId: string) {
  peer.unsubscribe(conversationId)
}

export function broadcastToConversation(conversationId: string, message: string) {
  for (const peer of allPeers) {
    if (peer.topics?.has(conversationId)) {
      try {
        peer.send(message)
      } catch {
        allPeers.delete(peer)
      }
    }
  }
}

export function sendToUser(userId: string, message: string) {
  const peer = peerByUserId.get(userId)
  if (peer) {
    try {
      peer.send(message)
    } catch {
      allPeers.delete(peer)
    }
  }
}

function broadcastToAll(message: string) {
  for (const peer of allPeers) {
    try {
      peer.send(message)
    } catch {
      allPeers.delete(peer)
    }
  }
}
