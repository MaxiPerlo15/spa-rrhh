import { expect, test } from '@playwright/test'

test.describe('API Smoke', () => {
  test('GET /api/vacancies responde 200 y lista JSON', async ({ request }) => {
    const response = await request.get('/api/vacancies')
    expect(response.ok()).toBeTruthy()

    const payload = await response.json()
    expect(Array.isArray(payload)).toBeTruthy()
  })

  test('GET /api/auth/csrf responde 200 con token', async ({ request }) => {
    const response = await request.get('/api/auth/csrf')
    expect(response.ok()).toBeTruthy()

    const payload = await response.json()
    expect(typeof payload.csrfToken).toBe('string')
    expect(payload.csrfToken.length).toBeGreaterThan(0)
  })

  test('GET /api/admin/notifications protegido sin sesión', async ({ request }) => {
    const response = await request.get('/api/admin/notifications')

    // Sin sesión de admin debe responder protegido (401/403)
    expect([401, 403]).toContain(response.status())
  })
})
