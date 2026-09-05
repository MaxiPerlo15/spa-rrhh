import { expect, test } from '@playwright/test'

const springAuthEnabled = process.env.SPRING_AUTH_ENABLED === 'true'
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
const springBackendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '')

test.describe('Admin Login via Spring Session', () => {
  test.skip(!springAuthEnabled, 'SPRING_AUTH_ENABLED must be true for Spring session tests')
  test.skip(!adminEmail || !adminPassword, 'ADMIN_EMAIL and ADMIN_PASSWORD required')
  test.skip(!springBackendUrl, 'BACKEND_URL is required to verify the Spring session directly')

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

  test('authorizes the first protected notification BFF call after relay login', async ({ context }) => {
    const relayResponse = await context.request.post('/api/auth/spring/login', {
      data: { email: adminEmail, password: adminPassword }
    })

    expect(relayResponse.status()).toBe(200)
    expect(relayResponse.headers()['set-cookie']).toContain('SESSIONID=')
    const loginSessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
    expect(loginSessionCookie, 'the login relay must persist SESSIONID before the first protected BFF request').toBeDefined()
    expect(loginSessionCookie?.path).toBe('/')
    expect(loginSessionCookie?.httpOnly).toBe(true)

    const notificationsResponse = await context.request.get('/api/admin/notifications?view=all&page=1&limit=20')
    expect(notificationsResponse.status(), 'the first protected BFF request must remain authorized after Spring rotation').toBe(200)

    const rotatedSessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
    expect(rotatedSessionCookie, 'the protected BFF response must retain a browser SESSIONID').toBeDefined()
    expect(rotatedSessionCookie?.path).toBe('/')
    expect(rotatedSessionCookie?.httpOnly).toBe(true)

    const directSession = await context.request.get(`${springBackendUrl}/api/v1/auth/me`, {
      headers: { Cookie: `SESSIONID=${rotatedSessionCookie!.value}` },
      failOnStatusCode: false
    })
    expect(directSession.status(), 'the retained browser session must authorize direct Spring /auth/me').toBe(200)
  })

  test('persists settings changes through the Spring-backed adapter', async ({ context }) => {
    const loginResponse = await context.request.post('/api/auth/spring/login', {
      data: { email: adminEmail, password: adminPassword }
    })
    expect(loginResponse.status()).toBe(200)

    const initialResponse = await context.request.get('/api/admin/settings')
    expect(initialResponse.status()).toBe(200)
    const initial = await initialResponse.json()
    expect(initial.profile.email).toBe(adminEmail)

    const patchResponse = await context.request.patch('/api/admin/settings', {
      data: { name: 'Spring E2E Updated', notifyNewContacts: true }
    })
    expect(patchResponse.status()).toBe(200)

    const persistedResponse = await context.request.get('/api/admin/settings')
    expect(persistedResponse.status()).toBe(200)
    const persisted = await persistedResponse.json()
    expect(persisted.profile.name).toBe('Spring E2E Updated')
    expect(persisted.preferences.notifyNewContacts).toBe(true)
  })

  for (const path of ['/api/vacancies?all=true', '/api/applications', '/api/contacts']) {
    test(`authorizes the first protected dashboard read ${path} after relay login`, async ({ context }) => {
      const loginResponse = await context.request.post('/api/auth/spring/login', {
        data: { email: adminEmail, password: adminPassword }
      })
      expect(loginResponse.status()).toBe(200)

      const protectedResponse = await context.request.get(path)
      expect(protectedResponse.status()).toBe(200)

      const sessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
      expect(sessionCookie).toBeDefined()
      const directSession = await context.request.get(`${springBackendUrl}/api/v1/auth/me`, {
        headers: { Cookie: `SESSIONID=${sessionCookie!.value}` },
        failOnStatusCode: false
      })
      expect(directSession.status()).toBe(200)
    })
  }

  test('logs in via Spring and hands the browser session to the admin proxy', async ({ page, context }) => {
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    const relayResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/auth/spring/login' && response.request().method() === 'POST'
    )
    const firstAdminRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname === '/admin'
    )
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    const response = await relayResponse
    expect(response.status()).toBe(200)
    const setCookie = await response.headerValue('set-cookie')
    expect(setCookie).toContain('SESSIONID=')
    expect(setCookie).not.toMatch(/;\s*Secure\b/i)

    const loginSessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
    expect(loginSessionCookie, 'the login relay must persist SESSIONID in the browser cookie jar').toBeDefined()
    expect(loginSessionCookie?.path).toBe('/')
    expect(loginSessionCookie?.httpOnly).toBe(true)

    const adminRequest = await firstAdminRequest
    const adminCookieHeader = await adminRequest.headerValue('cookie')
    const sessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
    expect(sessionCookie, 'the first /admin response must retain a browser SESSIONID').toBeDefined()
    expect(sessionCookie?.path).toBe('/')
    expect(sessionCookie?.httpOnly).toBe(true)
    console.info(
      `[Spring auth E2E] login SESSIONID jar path=${loginSessionCookie?.path} httpOnly=${loginSessionCookie?.httpOnly}; ` +
      `/admin Cookie has login SESSIONID=${adminCookieHeader?.includes(`SESSIONID=${loginSessionCookie?.value}`) ?? false}; ` +
      `proxy rotated SESSIONID=${sessionCookie?.value !== loginSessionCookie?.value}`
    )
    expect(adminCookieHeader, 'the first /admin request must send the login SESSIONID').toContain(`SESSIONID=${loginSessionCookie!.value}`)

    const directSession = await context.request.get(`${springBackendUrl}/api/v1/auth/me`, {
      headers: { Cookie: `SESSIONID=${sessionCookie!.value}` },
      failOnStatusCode: false
    })
    console.info(`[Spring auth E2E] direct Spring /auth/me status=${directSession.status()}`)
    expect(directSession.status(), 'the browser SESSIONID must authorize direct Spring /auth/me').toBe(200)

    await expect(page).toHaveURL('/admin', { timeout: 15000 })
  })

  test('SESSIONID cookie is set after Spring login', async ({ page, context }) => {
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'SESSIONID')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.path).toBe('/')
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

  test('expires SESSIONID in the Next-origin browser context after Spring logout', async ({ context }) => {
    const loginResponse = await context.request.post('/api/auth/spring/login', {
      data: { email: adminEmail, password: adminPassword }
    })
    expect(loginResponse.status()).toBe(200)
    expect((await context.cookies()).find(cookie => cookie.name === 'SESSIONID')).toBeDefined()

    const logoutResponse = await context.request.post('/api/auth/spring/logout')
    expect(logoutResponse.status()).toBe(204)
    expect(logoutResponse.headers()['set-cookie']).toContain('Max-Age=0')
    expect((await context.cookies()).find(cookie => cookie.name === 'SESSIONID')).toBeUndefined()
  })

  test('redirects to signin when no SESSIONID cookie', async ({ page }) => {
    await page.goto('/admin')

    // Should redirect to signin since no session exists
    await expect(page).toHaveURL(/\/admin\/signin/, { timeout: 10000 })
  })
})
