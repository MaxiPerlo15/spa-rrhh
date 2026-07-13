import { writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

function createSamplePdf(fileName: string) {
  const filePath = path.join(os.tmpdir(), fileName)
  writeFileSync(
    filePath,
    Buffer.from(`%PDF-1.4
1 0 obj
<<>>
endobj
xref
0 2
0000000000 65535 f 
0000000010 00000 n 
trailer
<< /Root 1 0 R /Size 2 >>
startxref
40
%%EOF`)
  )
  return filePath
}

async function fillContactForm(page: Page) {
  await page.goto('/#contacto')

  await page.getByLabel(/Nombre Completo \*/i).fill('Ana Pérez')
  await page.getByLabel(/Email \*/i).fill('ana.perez@example.com')
  await page.getByLabel(/Asunto \*/i).fill('Consulta comercial')
  await page.getByLabel(/Mensaje \*/i).fill('Necesito más información sobre los servicios.')
  await page.getByRole('checkbox', {
    name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
  }).check()
}

async function fillApplicationForm(page: Page) {
  await page.goto('/ofertas-laborales')
  await page.getByRole('button', { name: /Postularme/i }).first().click()

  await page.getByLabel(/Nombre Completo \*/i).fill('Ana Pérez')
  await page.getByLabel(/Email \*/i).fill('ana.perez@example.com')
  await page.getByLabel(/Teléfono \*/i).fill('+54 9 11 1234-5678')
  await page.getByRole('checkbox', {
    name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
  }).check()

  const resumePath = createSamplePdf('spa-rrhh-e2e-resume.pdf')
  await page.locator('input[type="file"]').first().setInputFiles(resumePath)
  await expect(page.getByText(/CV subido correctamente/i)).toBeVisible()
}

test.describe('Public forms retry UX', () => {
  test('reintenta el envío del formulario de contacto tras un error y completa el éxito', async ({ page }) => {
    test.setTimeout(60_000)

    let attempts = 0
    await page.route('**/api/contacts', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }

      attempts += 1

      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error al crear el contacto' })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Mensaje enviado exitosamente',
          contactId: 'contact-retry-1'
        })
      })
    })

    await fillContactForm(page)

    await page.getByRole('button', { name: /Enviar Consulta/i }).click()
    await expect(page.getByRole('heading', { name: /Revisá tu consulta antes de enviarla/i })).toBeVisible()

    await page.getByRole('button', { name: /Confirmar consulta/i }).click()
    await expect(page.getByRole('button', { name: /Enviando\.\.\./i })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Error al crear el contacto' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Confirmar consulta/i })).toBeVisible()

    await page.getByRole('button', { name: /Confirmar consulta/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: '¡Mensaje enviado exitosamente!' })).toBeVisible()
    await expect(page.getByText(/Te contactaremos a la brevedad a/i)).toBeVisible()
    await expect(page.getByLabel(/Email \*/i)).toHaveValue('')
  })

  test('reintenta la postulación pública tras un error y completa el éxito', async ({ page }) => {
    test.setTimeout(90_000)

    let attempts = 0
    await page.route('**/api/applications', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }

      attempts += 1

      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error al crear la postulación' })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Postulación enviada exitosamente',
          applicationId: 'application-retry-1'
        })
      })
    })

    await fillApplicationForm(page)

    await page.getByRole('button', { name: /^Enviar CV$/i }).click()
    await expect(page.getByRole('button', { name: /Enviando\.\.\./i })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Error al crear la postulación' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Enviar CV$/i })).toBeEnabled()

    await page.getByRole('button', { name: /^Enviar CV$/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /Postulación enviada exitosamente/i })).toBeVisible()
    await expect(page.getByText(/Postulación enviada exitosamente/i)).toBeVisible()

    await page.waitForTimeout(2500)
    await expect(page.getByRole('button', { name: /^Enviar CV$/i })).toHaveCount(0)
  })
})
