import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Pinia stores', () => {
  const storesDir = resolve(process.cwd(), 'app', 'stores')

  it('auth store has required methods', () => {
    const content = readFileSync(resolve(storesDir, 'auth.ts'), 'utf-8')
    expect(content).toContain('defineStore')
    expect(content).toContain('login')
    expect(content).toContain('logout')
    expect(content).toContain('fetchUser')
    expect(content).toContain('loggedIn')
    expect(content).toContain('currentUser')
  })

  it('chat store has required methods', () => {
    const content = readFileSync(resolve(storesDir, 'chat.ts'), 'utf-8')
    expect(content).toContain('defineStore')
    expect(content).toContain('loadData')
    expect(content).toContain('chatData')
    expect(content).toContain('currentConversationId')
    expect(content).toContain('pendingMessages')
    expect(content).toContain('typingUsers')
  })

  it('contacts store has required methods', () => {
    const content = readFileSync(resolve(storesDir, 'contacts.ts'), 'utf-8')
    expect(content).toContain('defineStore')
    expect(content).toContain('contactList')
    expect(content).toContain('addContactByPhone')
    expect(content).toContain('removeContact')
  })

  it('ws store has required methods', () => {
    const content = readFileSync(resolve(storesDir, 'ws.ts'), 'utf-8')
    expect(content).toContain('defineStore')
    expect(content).toContain('connect')
    expect(content).toContain('disconnect')
    expect(content).toContain('send')
    expect(content).toContain('sendTyping')
    expect(content).toContain('onMessage')
    expect(content).toContain('isOnline')
  })
})
