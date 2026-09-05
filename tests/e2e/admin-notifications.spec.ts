import { expect, test } from '@playwright/test'

const springAuthEnabled = process.env.SPRING_AUTH_ENABLED === 'true'
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

async function signIn(
  page: import('@playwright/test').Page,
  context: import('@playwright/test').BrowserContext
) {
  await page.addInitScript(() => localStorage.setItem('admin_onboarding_completed_v1', 'true'))

  const relayResponse = await context.request.post('/api/auth/spring/login', {
    data: { email: adminEmail, password: adminPassword }
  })
  expect(relayResponse.status()).toBe(200)
  expect(relayResponse.headers()['set-cookie']).toContain('SESSIONID=')

  const sessionCookie = (await context.cookies()).find(cookie => cookie.name === 'SESSIONID')
  expect(sessionCookie, 'the login relay must persist SESSIONID before navigating to /admin').toBeDefined()
  expect(sessionCookie?.path).toBe('/')
  expect(sessionCookie?.httpOnly).toBe(true)

  await page.goto('/admin')
  await expect(page).toHaveURL('/admin', { timeout: 15_000 })
}

test.describe('Spring-backed admin notifications', () => {
  test.skip(!springAuthEnabled, 'SPRING_AUTH_ENABLED must be true for Spring notification tests')
  test.skip(!adminEmail || !adminPassword, 'ADMIN_EMAIL and ADMIN_PASSWORD required')

  test('marks one notification read and deletes another through the Next item proxy', async ({ page, context }) => {
    await signIn(page, context)
    await page.getByRole('button', { name: /Notificaciones del panel/i }).click()

    const dialog = page.getByRole('dialog', { name: /Notificaciones/i })
    await expect(dialog.getByText('Spring notification to read')).toBeVisible()
    const patchResponse = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/api/admin/notifications/spring-notification-read') &&
      response.request().method() === 'PATCH'
    )
    await dialog.getByText('Spring notification to read').locator('xpath=../..').getByRole('button', { name: 'Marcar leida' }).click()
    expect((await patchResponse).status()).toBe(200)
    const afterPatch = await page.request.get('/api/admin/notifications?view=all&page=1&limit=50')
    expect(afterPatch.status()).toBe(200)
    await expect(afterPatch.json()).resolves.toMatchObject({
      items: expect.arrayContaining([expect.objectContaining({ id: 'spring-notification-read', isRead: true })])
    })

    const deleteResponse = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/api/admin/notifications/spring-notification-delete') &&
      response.request().method() === 'DELETE'
    )
    await dialog.getByRole('button', { name: /Eliminar notificación: Spring notification to delete/i }).click()
    expect((await deleteResponse).status()).toBe(200)
    const afterDelete = await page.request.get('/api/admin/notifications?view=all&page=1&limit=50')
    expect(afterDelete.status()).toBe(200)
    await expect(afterDelete.json()).resolves.toMatchObject({
      items: expect.not.arrayContaining([expect.objectContaining({ id: 'spring-notification-delete' })])
    })
  })
})
