import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

async function loginAsAdmin(page: Page) {
  if (!adminEmail || !adminPassword) {
    test.skip(true, 'Definir ADMIN_EMAIL y ADMIN_PASSWORD para pruebas autenticadas de vacantes')
  }

  await page.goto('/admin/signin')
  await page.fill('input[name="email"]', adminEmail!)
  await page.fill('input[name="password"]', adminPassword!)
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
  await expect(page).toHaveURL('/admin', { timeout: 15000 })
}

async function closeOnboardingIfPresent(page: Page) {
  const close = page.getByRole('button', { name: /Cerrar onboarding/i })
  if (await close.isVisible({ timeout: 1000 }).catch(() => false)) {
    await close.click()
  }
}

test.describe('Vacantes - flujo crítico admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await closeOnboardingIfPresent(page)
    await expect(page.getByRole('heading', { name: /Gestión de Vacantes/i })).toBeVisible()
  })

  test('crear, editar, cerrar/activar y eliminar vacante', async ({ page }) => {
    const baseTitle = `QA Vacancy ${Date.now()}`
    const editedTitle = `${baseTitle} Editada`

    await page.getByRole('button', { name: /\+ Nueva Vacante/i }).click()
    await expect(page.getByRole('heading', { name: /Nueva Vacante/i })).toBeVisible()

    await page.fill('#title', baseTitle)
    await page.fill('#location', 'Las Varillas, Córdoba')
    await page.fill('#salary', '$1.200.000 - $1.800.000')
    await page.fill('#description', 'Descripción E2E para vacante crítica.')
    await page.fill('#requirements', '2 años de experiencia.')
    await page.fill('#benefits', 'Obra social y capacitaciones.')
    await page.getByRole('button', { name: /Crear Vacante/i }).click()

    await expect(page.getByText(/Vacante creada exitosamente/i)).toBeVisible()
    const createdRow = page.locator('tr', { hasText: baseTitle }).first()
    await expect(createdRow).toBeVisible()

    await createdRow.getByRole('button', { name: /Editar/i }).click()
    await expect(page.getByRole('heading', { name: /Editar Vacante/i })).toBeVisible()
    await page.fill('#title', editedTitle)
    await page.getByRole('button', { name: /Actualizar/i }).click()
    await expect(page.getByText(/Vacante actualizada exitosamente/i)).toBeVisible()

    const editedRow = page.locator('tr', { hasText: editedTitle }).first()
    await expect(editedRow).toBeVisible()

    const toggleButton = editedRow.getByRole('button', { name: /Cerrar|Activar/i })
    await toggleButton.click()
    await page.getByRole('button', { name: /Sí, (cerrar|activar) vacante/i }).click()
    await expect(page.getByText(/Vacante (cerrada|activada) exitosamente/i)).toBeVisible()

    await editedRow.getByRole('button', { name: /Eliminar/i }).click()
    await page.getByRole('button', { name: /Eliminar vacante/i }).click()
    await expect(page.getByText(/Vacante eliminada exitosamente/i)).toBeVisible()
  })

  test('mantiene filtros y orden en tabla de vacantes (persistencia)', async ({ page }) => {
    const search = page.getByPlaceholder(/Buscar por título o ubicación/i)
    await search.fill('Córdoba')
    await page.waitForTimeout(250)

    await page.getByRole('combobox').nth(0).selectOption('closed')
    await page.getByRole('combobox').nth(1).selectOption('title')
    await page.getByRole('combobox').nth(2).selectOption('asc')

    await expect(page.getByText(/vacantes/i).first()).toBeVisible()

    await page.reload()

    await expect(page.getByPlaceholder(/Buscar por título o ubicación/i)).toHaveValue('Córdoba')
    await expect(page.getByRole('combobox').nth(0)).toHaveValue('closed')
    await expect(page.getByRole('combobox').nth(1)).toHaveValue('title')
    await expect(page.getByRole('combobox').nth(2)).toHaveValue('asc')
  })
})
