import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('routing structure', () => {
  const pagesDir = resolve(process.cwd(), 'app', 'pages')

  it('has login page', () => {
    const content = readFileSync(resolve(pagesDir, 'login.vue'), 'utf-8')
    expect(content).toContain('definePageMeta')
    expect(content).toContain('handleSubmit')
    expect(content).toContain('authStore.login')
  })

  it('has chat page', () => {
    const content = readFileSync(resolve(pagesDir, 'chat.vue'), 'utf-8')
    expect(content).toContain('ChatLayout')
    expect(content).toContain("middleware: 'auth'")
  })

  it('has index redirect page', () => {
    const content = readFileSync(resolve(pagesDir, 'index.vue'), 'utf-8')
    expect(content).toContain('navigateTo')
  })

  it('has auth middleware', () => {
    const middlewareDir = resolve(process.cwd(), 'app', 'middleware')
    const content = readFileSync(resolve(middlewareDir, 'auth.ts'), 'utf-8')
    expect(content).toContain('defineNuxtRouteMiddleware')
    expect(content).toContain('authStore')
    expect(content).toContain('navigateTo')
  })

  it('app.vue uses NuxtPage', () => {
    const content = readFileSync(resolve(process.cwd(), 'app', 'app.vue'), 'utf-8')
    expect(content).toContain('NuxtPage')
  })
})
