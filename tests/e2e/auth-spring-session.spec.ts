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
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    const relayResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/auth/spring/login' && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    const response = await relayResponse
    expect(response.status()).toBe(200)
    const setCookie = await response.headerValue('set-cookie')
    expect(setCookie).toContain('SESSIONID=')
    expect(setCookie).not.toMatch(/;\s*Secure\b/i)
    await expect(page).toHaveURL('/admin', { timeout: 15000 })
    await expect(page.getByRole('heading', { level: 1, name: /Panel Administrativo/i })).toBeVisible()
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

  test('admin page access with valid Spring session', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    // Navigate to the protected admin route — should work with existing session
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
  })

  test('logs out through Spring after accessing the admin panel', async ({ page, context }) => {
    await page.evaluate(() => localStorage.setItem('admin_onboarding_completed_v1', 'true'))
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    await expect(page.getByText('Inicio de sesión exitoso.')).toBeHidden({ timeout: 10000 })

    await page.getByRole('button', { name: 'Cerrar sesión del panel' }).click()
    const logoutResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/auth/spring/logout' && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Sí, cerrar sesión' }).click()

    expect((await logoutResponse).status()).toBe(204)
    await expect(page).toHaveURL(/\/admin\/signin/, { timeout: 15000 })
    expect((await context.cookies()).find(cookie => cookie.name === 'SESSIONID')).toBeUndefined()
  })

  test('redirects to signin when no SESSIONID cookie', async ({ page }) => {
    await page.goto('/admin')

    // Should redirect to signin since no session exists
    await expect(page).toHaveURL(/\/admin\/signin/, { timeout: 10000 })
  })
})
