let allPeers: Set<any> = new Set()
const userIdByPeer = new Map<any, string>()
const peerByUserId = new Map<string, any>()
const conversationPeers = new Map<string, Set<any>>()

export function registerPeer(peer: any) {
  allPeers.add(peer)
}

export function unregisterPeer(peer: any) {
  allPeers.delete(peer)
  const userId = userIdByPeer.get(peer)
  if (userId) {
    userIdByPeer.delete(peer)
    peerByUserId.delete(userId)
    for (const peers of conversationPeers.values()) {
      peers.delete(peer)
    }
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
  peer.userId = userId

  const onlineIds = [...peerByUserId.keys()].filter(id => id !== userId)
  peer.send(JSON.stringify({ type: 'presence-snapshot', userIds: onlineIds }))

  broadcastToAll(JSON.stringify({ type: 'user-online', userId }))
}

export function isUserOnline(userId: string) {
  return peerByUserId.has(userId)
}

export function subscribeToConversation(peer: any, conversationId: string) {
  peer.subscribe(conversationId)
  if (!conversationPeers.has(conversationId)) {
    conversationPeers.set(conversationId, new Set())
  }
  conversationPeers.get(conversationId)!.add(peer)
}

export function unsubscribeFromConversation(peer: any, conversationId: string) {
  peer.unsubscribe(conversationId)
  const peers = conversationPeers.get(conversationId)
  if (peers) {
    peers.delete(peer)
    if (peers.size === 0) conversationPeers.delete(conversationId)
  }
}

export function broadcastToConversation(conversationId: string, message: string) {
  const peers = conversationPeers.get(conversationId)
  if (!peers) return
  for (const peer of peers) {
    try {
      peer.send(message)
    } catch {
      peers.delete(peer)
    }
  }
}

export function isUserSubscribed(userId: string, conversationId: string) {
  const peer = peerByUserId.get(userId)
  if (!peer) return false
  const peers = conversationPeers.get(conversationId)
  return peers?.has(peer) || false
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
