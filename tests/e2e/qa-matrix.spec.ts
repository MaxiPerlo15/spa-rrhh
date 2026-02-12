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
})
