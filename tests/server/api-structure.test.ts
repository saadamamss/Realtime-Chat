import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('API route structure', () => {
  const serverDir = resolve(process.cwd(), 'server')

  it('has login endpoint', () => {
    const path = resolve(serverDir, 'api', 'auth', 'login.post.ts')
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('validate')
    expect(content).toContain('loginSchema')
    expect(content).toContain('findUserByPhoneNumber')
  })

  it('has logout endpoint', () => {
    const path = resolve(serverDir, 'api', 'auth', 'logout.post.ts')
    expect(readFileSync(path, 'utf-8')).toBeTruthy()
  })

  it('has messages endpoints', () => {
    const get = resolve(serverDir, 'api', 'messages.get.ts')
    const post = resolve(serverDir, 'api', 'messages.post.ts')
    expect(readFileSync(get, 'utf-8')).toContain('getMessages')
    expect(readFileSync(post, 'utf-8')).toContain('createMessage')
  })

  it('has contacts endpoints', () => {
    const get = resolve(serverDir, 'api', 'contacts.get.ts')
    const post = resolve(serverDir, 'api', 'contacts.post.ts')
    const del = resolve(serverDir, 'api', 'contacts.delete.ts')
    expect(readFileSync(get, 'utf-8')).toBeTruthy()
    expect(readFileSync(post, 'utf-8')).toBeTruthy()
    expect(readFileSync(del, 'utf-8')).toBeTruthy()
  })

  it('has conversations endpoints', () => {
    const get = resolve(serverDir, 'api', 'conversations.get.ts')
    const post = resolve(serverDir, 'api', 'conversations.post.ts')
    const del = resolve(serverDir, 'api', 'conversations.delete.ts')
    expect(readFileSync(get, 'utf-8')).toContain('getConversations')
    expect(readFileSync(post, 'utf-8')).toContain('getOrCreateDMConversation')
    expect(readFileSync(del, 'utf-8')).toBeTruthy()
  })

  it('has file serving endpoint', () => {
    const path = resolve(serverDir, 'api', 'files', '[...path].get.ts')
    const content = readFileSync(path, 'utf-8')
    expect(content).toContain('getFileConversationId')
    expect(content).toContain('isParticipant')
  })
})
