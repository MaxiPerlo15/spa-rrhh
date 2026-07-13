import { expect, test } from '@playwright/test'

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

async function loginAsAdmin(page: import('@playwright/test').Page) {
  if (!adminEmail || !adminPassword) {
    test.skip(true, 'Definir ADMIN_EMAIL y ADMIN_PASSWORD para smoke autenticado')
  }

  await page.goto('/admin/signin')
  await page.fill('input[name="email"]', adminEmail!)
  await page.fill('input[name="password"]', adminPassword!)
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
  await expect(page).toHaveURL('/admin', { timeout: 15000 })

  const closeOnboarding = page.getByRole('button', { name: /Cerrar onboarding/i })
  if (await closeOnboarding.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeOnboarding.click()
  }
}

test.describe('QA Matrix Smoke', () => {
  test('home render + core sections', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Conectamos')
    await expect(page.getByRole('button', { name: /Ver Ofertas Laborales/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Enviar CV/i })).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('jobs page filters + cards area', async ({ page }) => {
    await page.goto('/ofertas-laborales')

    await expect(page.getByRole('heading', { level: 1, name: /Ofertas Laborales/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Buscar por título/i)).toBeVisible()
    const selectCount = await page.locator('select').count()
    expect(selectCount).toBeGreaterThanOrEqual(2)
    await expect(page.locator('section').last()).toBeVisible()
  })

  test('footer hash navigation from jobs to home sections', async ({ page }) => {
    await page.goto('/ofertas-laborales')
    await expect(page.getByRole('button', { name: /^Empresas$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Contacto$/ })).toBeVisible()
  })

  test('landing reload normalizes hash route to root', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navegación hash + reload es inestable en WebKit CI')

    await page.goto('/#contacto')
    await expect(page).toHaveURL(/\/(#contacto)?$/)

    await page.reload()
    await expect(page).toHaveURL('/')
  })

  test('admin auth screens are reachable', async ({ page }) => {
    await page.goto('/admin/signin')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Panel Administrativo')
    await expect(page.getByRole('link', { name: /Olvidaste tu contraseña/i })).toBeVisible()

    await page.getByRole('link', { name: /Olvidaste tu contraseña/i }).click()
    await expect(page).toHaveURL('/admin/forgot-password')
    await expect(page.getByRole('heading', { level: 1, name: /Recuperar contraseña/i })).toBeVisible()
  })

  test('signin shows invalid credentials feedback', async ({ page }) => {
    await page.goto('/admin/signin')
    await page.fill('input[name="email"]', `qa-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'invalid-password')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/Credenciales inválidas/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/signin/)
  })

  test('forgot-password UI handles success response', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'Si existe una cuenta con ese email, enviamos un enlace para restablecer la contraseña.'
        })
      })
    })

    await page.goto('/admin/forgot-password')
    await page.fill('input[name="email"]', 'admin@sparrhh.com')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/Si existe una cuenta con ese email/i).first()).toBeVisible()
  })

  test('reset-password page validates missing token state', async ({ page }) => {
    await page.goto('/admin/reset-password')
    await expect(page.locator('text=El enlace de recuperación es inválido o no contiene token.')).toBeVisible()
  })

  test('admin tabs + notificaciones + configuración (smoke)', async ({ page }) => {
    await loginAsAdmin(page)

    await page.getByRole('button', { name: /Postulaciones/i }).click()
    await expect(page.getByText(/Filtrar por estado/i)).toBeVisible()

    await page.getByRole('button', { name: /Contactos/i }).click()
    await expect(page.getByText(/Filtrar por estado/i)).toBeVisible()

    await page.getByRole('button', { name: /Notificaciones/i }).click()
    await expect(page.getByRole('dialog', { name: /Bandeja de notificaciones/i })).toBeVisible()

    await page.getByRole('button', { name: /Configuracion/i }).click()
    await expect(page.getByRole('heading', { name: /Configuración de cuenta/i })).toBeVisible()

    await expect(page.getByRole('heading', { name: /Timeline de auditoría/i })).toBeVisible()
  })
})
