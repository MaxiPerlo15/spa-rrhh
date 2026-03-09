import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

async function maybeCloseOnboarding(page: Page) {
  const closeOnboarding = page.getByRole('button', { name: /Cerrar onboarding/i })
  if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeOnboarding.click()
  }
}

test.describe('Autenticación Admin', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies()
    await page.goto('/admin/signin')
  })

  test('renderiza pantalla de login', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /Panel Administrativo/i })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible()
  })

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[name="email"]', `qa-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'passwordIncorrecto')
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await expect(page.getByText(/Credenciales inválidas/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/signin/)
  })

  test('inicia sesión con credenciales válidas', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'Definir ADMIN_EMAIL y ADMIN_PASSWORD para login exitoso')
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()

    await expect(page).toHaveURL('/admin', { timeout: 15000 })
    await maybeCloseOnboarding(page)
    await expect(page.getByRole('heading', { level: 1, name: /Panel Administrativo/i })).toBeVisible()
  })

  test('si ya está autenticado, no permanece en /admin/signin', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'Definir ADMIN_EMAIL y ADMIN_PASSWORD para redirección autenticada')
    await page.fill('input[name="email"]', adminEmail!)
    await page.fill('input[name="password"]', adminPassword!)
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
    await expect(page).toHaveURL('/admin', { timeout: 15000 })

    await page.goto('/admin/signin')
    await page.waitForTimeout(600)
    expect(page.url()).not.toContain('/admin/signin')
  })
})
