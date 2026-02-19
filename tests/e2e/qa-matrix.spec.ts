import { expect, test } from '@playwright/test'

test.describe('QA Matrix Smoke', () => {
  test('home render + core sections', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('nav')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Conectamos')
    await expect(page.locator('button:has-text("Ver Vacantes")')).toBeVisible()
    await expect(page.locator('button:has-text("Contactanos")')).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('jobs page filters + cards area', async ({ page }) => {
    await page.goto('/ofertas-laborales')

    await expect(page.locator('h1:has-text("Ofertas Laborales")')).toBeVisible()
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible()
    const selectCount = await page.locator('select').count()
    expect(selectCount).toBeGreaterThanOrEqual(2)
    await expect(page.locator('section').nth(2)).toBeVisible()
  })

  test('footer hash navigation from jobs to home sections', async ({ page }) => {
    await page.goto('/ofertas-laborales')
    await page.locator('footer button:has-text("Empresas")').click()
    await expect(page).toHaveURL(/\/#empresas/)

    await expect
      .poll(async () => {
        return page.locator('#empresas').evaluate((el) => el.getBoundingClientRect().top)
      })
      .toBeGreaterThanOrEqual(40)
    await expect
      .poll(async () => {
        return page.locator('#empresas').evaluate((el) => el.getBoundingClientRect().top)
      })
      .toBeLessThan(180)

    await page.locator('footer button:has-text("Contacto")').click()
    await expect(page).toHaveURL(/\/#contacto/)

    await expect
      .poll(async () => {
        return page.locator('#contacto').evaluate((el) => el.getBoundingClientRect().top)
      })
      .toBeGreaterThanOrEqual(40)
    await expect
      .poll(async () => {
        return page.locator('#contacto').evaluate((el) => el.getBoundingClientRect().top)
      })
      .toBeLessThan(180)
  })

  test('admin auth screens are reachable', async ({ page }) => {
    await page.goto('/admin/signin')
    await expect(page.locator('h1')).toContainText('Panel Administrativo')
    await expect(page.locator('a:has-text("¿Olvidaste tu contraseña?")')).toBeVisible()

    await page.locator('a:has-text("¿Olvidaste tu contraseña?")').click()
    await expect(page).toHaveURL('/admin/forgot-password')
    await expect(page.locator('h1:has-text("Recuperar contraseña")')).toBeVisible()
  })

  test('signin shows invalid credentials feedback', async ({ page }) => {
    await page.goto('/admin/signin')
    await page.fill('input[name="email"]', `qa-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'invalid-password')
    await page.click('button[type="submit"]')

    await expect(page.locator('div.bg-red-50.border-red-200').first()).toBeVisible()
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

    await expect(page.locator('div.bg-green-50.border-green-200').first()).toBeVisible()
  })

  test('reset-password page validates missing token state', async ({ page }) => {
    await page.goto('/admin/reset-password')
    await expect(page.locator('text=El enlace de recuperación es inválido o no contiene token.')).toBeVisible()
  })
})
