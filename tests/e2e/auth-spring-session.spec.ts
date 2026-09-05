import { expect, test } from '@playwright/test'

const springAuthEnabled = process.env.SPRING_AUTH_ENABLED === 'true'
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

test.describe('Admin Login via Spring Session', () => {
  test.skip(!springAuthEnabled, 'SPRING_AUTH_ENABLED must be true for Spring session tests')
  test.skip(!adminEmail || !adminPassword, 'ADMIN_EMAIL and ADMIN_PASSWORD required')

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/admin/signin')
  })

  test('renders login page', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /Panel Administrativo/i })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible()
  })

  test('shows error with invalid credentials via Spring', async ({ page }) => {
    await page.fill('input[name="email"]', `qa-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'passwordIncorrecto')
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await expect(page.getByText(/Credenciales inválidas/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/signin/)
  })

  test('logs in via Spring and redirects to admin panel', async ({ page }) => {
    const relayRequest = page.waitForRequest('/api/auth/spring/login')
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1, name: /Panel Administrativo/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cerrar sesión del panel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Vacantes', exact: true })).toBeVisible()
    await expect(page.locator('input[name="password"]')).toHaveCount(0)
    expect(new URL(page.url()).pathname).toBe('/admin')
    await relayRequest
  })

  test('SESSIONID cookie is set after Spring login', async ({ page, context }) => {
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'SESSIONID')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.httpOnly).toBe(true)
  })

  test('logs out through the same-origin relay and clears the browser session', async ({ page }) => {
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    const relayResponse = page.waitForResponse('/api/auth/spring/logout')
    await page.evaluate(() => fetch('/api/auth/spring/logout', { method: 'POST' }))
    expect((await relayResponse).status()).toBe(204)
    await expect(page).toHaveURL(/\/admin\/signin/)
    expect((await page.context().cookies()).find((cookie) => cookie.name === 'SESSIONID')).toBeUndefined()
  })

  test('redirects to signin when no SESSIONID cookie', async ({ page }) => {
    await page.goto('/admin/dashboard')

    // Should redirect to signin since no session exists
    await expect(page).toHaveURL(/\/admin\/signin/, { timeout: 10000 })
  })
})
