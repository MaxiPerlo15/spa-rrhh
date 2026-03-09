import { expect, test, type Page } from '@playwright/test'

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

function skipIfNotMobile(projectName: string) {
  test.skip(!projectName.startsWith('mobile'), 'Suite exclusiva para proyectos mobile')
}

async function loginAsAdmin(page: Page) {
  if (!adminEmail || !adminPassword) {
    test.skip(true, 'Definir ADMIN_EMAIL y ADMIN_PASSWORD para flujos mobile autenticados')
  }

  await page.goto('/admin/signin')
  await page.fill('input[name="email"]', adminEmail!)
  await page.fill('input[name="password"]', adminPassword!)
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click()
  await expect(page).toHaveURL('/admin', { timeout: 15000 })
}

async function closeOnboardingIfVisible(page: Page) {
  const closeOnboarding = page.getByRole('button', { name: /Cerrar onboarding/i }).first()
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await closeOnboarding.isVisible({ timeout: 800 }).catch(() => false)) {
      await closeOnboarding.click({ force: true })
      await expect(closeOnboarding).not.toBeVisible({ timeout: 5000 }).catch(() => {})
      return
    }
    await page.waitForTimeout(300)
  }
}

async function openFullTutorial(page: Page) {
  await page.getByRole('button', { name: /Ayuda del panel/i }).click()
  await page.getByRole('button', { name: /Ver tutorial completo/i }).click()
}

async function acceptCookiesIfVisible(page: Page) {
  const acceptButton = page.getByRole('button', { name: /Entendido/i })
  if (await acceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptButton.click()
  }
}

async function goToAdminTab(page: Page, tab: 'postulaciones' | 'contactos' | 'ajustes') {
  await closeOnboardingIfVisible(page)
  const mobileTabLabel =
    tab === 'postulaciones' ? /Postulac\./i : tab === 'contactos' ? /Contactos/i : /Ajustes/i
  await page
    .locator('nav[aria-label="Navegación principal del panel admin"]')
    .getByRole('button', { name: mobileTabLabel })
    .click({ force: true })
}

test.describe('Mobile critical flows (MIS-123)', () => {
  test('login/logout + navegación de módulos + notificaciones/settings', async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name)

    await loginAsAdmin(page)
    await closeOnboardingIfVisible(page)
    await acceptCookiesIfVisible(page)

    await expect(page.getByRole('heading', { name: /Gestión de Vacantes/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Filtrar vacantes por estado/i })).toBeVisible()

    await goToAdminTab(page, 'postulaciones')
    await expect(page.getByRole('button', { name: /Filtrar postulaciones por estado/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Generar Excel/i })).toBeVisible()

    await goToAdminTab(page, 'contactos')
    await expect(page.getByRole('button', { name: /Filtrar contactos por estado/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Buscar por nombre, email o asunto/i)).toBeVisible()

    await page.getByRole('button', { name: /Notificaciones del panel/i }).click()
    await expect(page.getByRole('dialog', { name: /Notificaciones/i })).toBeVisible()
    await page.getByRole('button', { name: /Cerrar panel/i }).click()
    await expect(page.getByRole('dialog', { name: /Notificaciones/i })).not.toBeVisible()

    await goToAdminTab(page, 'ajustes')
    await expect(page.getByRole('heading', { name: /Configuración de cuenta/i })).toBeVisible()

    await page.getByRole('button', { name: /Cerrar sesión del panel/i }).click({ force: true })
    await page.getByRole('button', { name: /Sí, cerrar sesión/i }).click()
    await expect(page).toHaveURL(/\/admin\/signin/)
  })

  test('onboarding mobile: apertura, avance, cierre y retorno', async ({ page }, testInfo) => {
    skipIfNotMobile(testInfo.project.name)

    await loginAsAdmin(page)
    await closeOnboardingIfVisible(page)
    await acceptCookiesIfVisible(page)

    await openFullTutorial(page)
    await expect(page.getByRole('dialog', { name: /Bienvenida/i })).toBeVisible()
    await page.getByRole('button', { name: /Siguiente módulo/i }).click()
    await expect(page.getByRole('dialog', { name: /Módulo de Vacantes/i })).toBeVisible()

    await page.getByRole('button', { name: /Cerrar onboarding/i }).click()
    await expect(page.getByRole('dialog', { name: /Módulo de Vacantes/i })).not.toBeVisible()

    await openFullTutorial(page)
    await expect(page.getByRole('dialog', { name: /Bienvenida/i })).toBeVisible()
  })
})
