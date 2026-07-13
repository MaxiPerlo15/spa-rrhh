import { expect, test } from '@playwright/test'

test.describe('Password reset flow', () => {
  test('submits a valid reset token and redirects to sign in', async ({ page }) => {
    await page.route('**/api/auth/reset-password', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fulfill({ status: 405, body: 'Method Not Allowed' })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Contraseña actualizada exitosamente'
        })
      })
    })

    await page.goto('/admin/reset-password?token=valid-reset-token')

    await expect(page.getByRole('heading', { name: /Crear nueva contraseña/i })).toBeVisible()
    await expect(page.getByText(/Debe incluir mayúsculas, minúsculas y números/i)).toBeVisible()

    await page.getByLabel(/Nueva contraseña/i).fill('NuevaClave123!')
    await page.getByLabel(/Confirmar contraseña/i).fill('NuevaClave123!')
    await page.getByRole('button', { name: /Guardar nueva contraseña/i }).click()

    await expect(page.locator('form')).toContainText(/Contraseña actualizada exitosamente/i)
    await expect(page).toHaveURL(/\/admin\/signin$/)
  })
})
