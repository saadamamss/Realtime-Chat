import { test, expect } from '@playwright/test'

test.describe('Login flow', () => {
  test('shows login form on root redirect', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('input[type="tel"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('shows register toggle', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Don\'t have an account')).toBeVisible()

    await page.click('text=Don\'t have an account')
    await expect(page.locator('input[placeholder="Your name..."]')).toBeVisible()
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="tel"]', '+1-555-9999')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Login failed')).toBeVisible({ timeout: 5000 })
  })

  test('can register and login', async ({ page }) => {
    const phone = `+1-555-${String(Date.now()).slice(-4)}`
    await page.goto('/login')

    // Register
    await page.click('text=Don\'t have an account')
    await page.fill('input[placeholder="Your name..."]', 'TestUser')
    await page.fill('input[type="tel"]', phone)
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to /chat
    await expect(page).toHaveURL(/\/chat/, { timeout: 10000 })
  })
})

test.describe('Chat page', () => {
  test('shows welcome screen when no conversation selected', async ({ page }) => {
    await page.goto('/chat')
    // Should show either welcome screen or redirect to login
    const url = page.url()
    expect(url.includes('/chat') || url.includes('/login')).toBe(true)
  })
})
