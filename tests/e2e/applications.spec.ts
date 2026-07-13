import { expect, test } from '@playwright/test'

test.describe('Ofertas + Postulación pública', () => {
  test('navegación, filtros y apertura/cierre de formulario', async ({ page }) => {
    await page.goto('/ofertas-laborales')
    await expect(page.getByRole('heading', { level: 1, name: /Ofertas Laborales/i })).toBeVisible()

    const search = page.getByPlaceholder(/Buscar por título/i)
    await search.fill('Vendedor')
    await page.waitForTimeout(250)

    const combos = page.getByRole('combobox')
    const comboCount = await combos.count()
    if (comboCount >= 2) {
      await combos.nth(0).selectOption({ index: 0 })
      await combos.nth(1).selectOption({ index: 0 })
    }

    const applyButton = page.getByRole('button', { name: /Postularme/i }).first()
    await expect(applyButton).toBeVisible()
    await applyButton.click()

    await expect(page.getByRole('heading', { name: /Postulación para Vendedor/i })).toBeVisible()
    await page.getByRole('button', { name: /Cancelar/i }).click()
    await expect(page.getByRole('heading', { name: /Postulación para Vendedor/i })).not.toBeVisible()
  })

  test('valida requeridos del formulario de postulación', async ({ page }) => {
    await page.goto('/ofertas-laborales')
    await page.getByRole('button', { name: /Postularme/i }).first().click()
    await expect(page.getByRole('heading', { name: /Postulación para/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /^Enviar CV$/i })).toBeDisabled()
    await expect(page.getByText(/Completa el captcha antes de subir el CV/i)).toBeVisible()
  })
})
