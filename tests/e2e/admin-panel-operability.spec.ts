import { expect, test, type Page } from '@playwright/test'

type AdminSettingsState = {
  notificationsEnabled: boolean
  notifyNewApplications: boolean
  notifyNewContacts: boolean
  notifySecurityAlerts: boolean
}

type MockNotification = {
  id: string
  title: string
  message: string
  level: 'info' | 'success' | 'warning'
  isRead: boolean
  createdAt: string
  action?: {
    label: string
    type: 'VACANCY' | 'APPLICATION' | 'CONTACT'
    resourceId: string
  }
}

type MockApplication = {
  id: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  status: 'PENDING' | 'REVIEWING' | 'INTERVIEWED' | 'ACCEPTED' | 'REJECTED'
  submittedAt: string
  vacancy?: {
    id: string
    title: string
  }
}

type MockContact = {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: 'PENDING' | 'RESPONDED' | 'ARCHIVED'
  createdAt: string
}

const adminSession = {
  user: {
    id: 'admin-user-1',
    name: 'QA Admin',
    email: 'admin@example.com',
    image: null,
    role: 'ADMIN'
  },
  expires: '2099-12-31T23:59:59.999Z'
}

const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100'

async function establishSpringAdminSession(page: Page) {
  const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
  const loginResponse = await page.request.post(`${backendUrl}/api/v1/auth/login`, {
    data: {
      email: readEnvValue('ADMIN_EMAIL'),
      password: readEnvValue('ADMIN_PASSWORD')
    }
  })

  if (!loginResponse.ok()) {
    throw new Error(`Spring admin login failed with ${loginResponse.status()}`)
  }

  const sessionId = loginResponse.headers()['set-cookie']?.match(/SESSIONID=([^;]+)/)?.[1]
  if (!sessionId) {
    throw new Error('Spring admin login did not set SESSIONID')
  }

  const sessionResponse = await page.request.get(`${backendUrl}/api/v1/auth/me`, {
    headers: { Cookie: `SESSIONID=${sessionId}` }
  })
  if (!sessionResponse.ok()) {
    throw new Error(`Spring admin session validation failed with ${sessionResponse.status()}`)
  }

  const session = await sessionResponse.json() as { rol?: { permisos?: string[] } }
  if (!session.rol?.permisos?.includes('admin:access')) {
    throw new Error('Spring admin session is missing admin:access')
  }

  const rotatedSessionId = sessionResponse.headers()['set-cookie']?.match(/SESSIONID=([^;]+)/)?.[1]

  await page.context().addCookies([
    {
      name: 'SESSIONID',
      value: rotatedSessionId ?? sessionId,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
      secure: baseUrl.startsWith('https://')
    }
  ])
}

function readEnvValue(name: string): string {
  const configuredValue = process.env[name]
  if (configuredValue) return configuredValue

  throw new Error(`Missing ${name} for the Spring admin fixture`)
}

async function mockAdminShell(page: Page, options?: {
  settings?: AdminSettingsState
  notifications?: MockNotification[]
  applications?: MockApplication[]
  contacts?: MockContact[]
}) {
  await establishSpringAdminSession(page)

  const settingsState: AdminSettingsState = options?.settings ?? {
    notificationsEnabled: true,
    notifyNewApplications: true,
    notifyNewContacts: true,
    notifySecurityAlerts: true
  }

  const notificationsState: MockNotification[] = options?.notifications ?? []
  const applicationsState: MockApplication[] = options?.applications ?? [
    {
      id: 'application-1',
      candidateId: 'candidate-1',
      candidateName: 'Lucía Pérez',
      email: 'lucia@example.com',
      phone: '+54 351 555 0101',
      status: 'PENDING',
      submittedAt: '2026-06-01T13:00:00.000Z',
      vacancy: {
        id: 'vacancy-1',
        title: 'Analista de RRHH'
      }
    }
  ]
  const contactsState: MockContact[] = options?.contacts ?? [
    {
      id: 'contact-1',
      name: 'María Gómez',
      email: 'maria@example.com',
      phone: '+54 351 555 0202',
      subject: 'Consulta sobre vacante',
      message: 'Quiero saber más sobre el puesto publicado.',
      status: 'PENDING',
      createdAt: '2026-06-01T14:00:00.000Z'
    }
  ]

  await page.addInitScript(() => {
    window.localStorage.setItem('admin_onboarding_completed_v1', 'true')
  })

  await page.route(/\/api\/auth\/session(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminSession)
    })
  })

  await page.route(/\/api\/vacancies(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'vacancy-1',
          title: 'Analista de RRHH',
          location: 'Córdoba',
          workday: 'FULL_TIME',
          modality: 'ON_SITE',
          status: 'ACTIVE',
          createdAt: '2026-06-01T12:00:00.000Z'
        }
      ])
    })
  })

  await page.route(/\/api\/applications(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(applicationsState)
    })
  })

  await page.route(/\/api\/contacts(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(contactsState)
    })
  })

  await page.route(/\/api\/admin\/settings(?:\?.*)?$/, async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: adminSession.user.id,
            email: adminSession.user.email,
            name: adminSession.user.name,
            role: adminSession.user.role
          },
          preferences: {
            notificationsEnabled: settingsState.notificationsEnabled,
            notifyNewApplications: settingsState.notifyNewApplications,
            notifyNewContacts: settingsState.notifyNewContacts,
            notifySecurityAlerts: settingsState.notifySecurityAlerts
          },
          updatedAt: '2026-06-01T15:00:00.000Z'
        })
      })
      return
    }

    if (method === 'PATCH') {
      const body = (await route.request().postDataJSON()) as Partial<AdminSettingsState>
      Object.assign(settingsState, body)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profile: {
            id: adminSession.user.id,
            email: adminSession.user.email,
            name: adminSession.user.name,
            role: adminSession.user.role
          },
          preferences: {
            notificationsEnabled: settingsState.notificationsEnabled,
            notifyNewApplications: settingsState.notifyNewApplications,
            notifyNewContacts: settingsState.notifyNewContacts,
            notifySecurityAlerts: settingsState.notifySecurityAlerts
          },
          updatedAt: '2026-06-01T16:00:00.000Z'
        })
      })
      return
    }

    await route.fulfill({ status: 405, body: 'Method Not Allowed' })
  })

  await page.route(/\/api\/admin\/audit(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1
        },
        filters: {
          actions: [],
          resourceTypes: [],
          actorEmails: []
        }
      })
    })
  })

  await page.route(/\/api\/admin\/notifications\/[^/?]+(?:\?.*)?$/, async (route) => {
    const method = route.request().method()
    const notificationId = new URL(route.request().url()).pathname.split('/').pop()
    const index = notificationsState.findIndex((item) => item.id === notificationId)

    if (index < 0) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
      return
    }

    if (method === 'PATCH') {
      const body = (await route.request().postDataJSON()) as { isRead?: boolean }
      if (typeof body.isRead === 'boolean') {
        notificationsState[index] = {
          ...notificationsState[index],
          isRead: body.isRead
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(notificationsState[index])
      })
      return
    }

    if (method === 'DELETE') {
      notificationsState.splice(index, 1)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Notificación eliminada' })
      })
      return
    }

    await route.fulfill({ status: 405, body: 'Method Not Allowed' })
  })

  await page.route(/\/api\/admin\/notifications(?:\?.*)?$/, async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const view = url.searchParams.get('view') ?? 'all'
    const pageNumber = Number(url.searchParams.get('page') ?? '1')
    const limit = Number(url.searchParams.get('limit') ?? '50')

    if (method === 'GET') {
      const visibleNotifications =
        view === 'read'
          ? notificationsState.filter((item) => item.isRead)
          : notificationsState

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: visibleNotifications.slice((pageNumber - 1) * limit, pageNumber * limit),
          pagination: {
            page: pageNumber,
            limit,
            total: visibleNotifications.length,
            totalPages: Math.max(1, Math.ceil(visibleNotifications.length / limit))
          }
        })
      })
      return
    }

    if (method === 'DELETE' && view === 'read') {
      const remaining = notificationsState.filter((item) => !item.isRead)
      notificationsState.splice(0, notificationsState.length, ...remaining)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ deletedCount: 0 })
      })
      return
    }

    await route.fulfill({ status: 405, body: 'Method Not Allowed' })
  })

  await page.route(/\/api\/applications\/[^/?]+(?:\?.*)?$/, async (route) => {
    const method = route.request().method()
    const applicationId = new URL(route.request().url()).pathname.split('/').pop()
    const index = applicationsState.findIndex((item) => item.id === applicationId)

    if (index < 0) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
      return
    }

    if (method === 'DELETE') {
      applicationsState.splice(index, 1)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Postulación eliminada' })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(applicationsState[index])
    })
  })

  await page.route(/\/api\/contacts\/[^/?]+(?:\?.*)?$/, async (route) => {
    const method = route.request().method()
    const contactId = new URL(route.request().url()).pathname.split('/').pop()
    const index = contactsState.findIndex((item) => item.id === contactId)

    if (index < 0) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not found' }) })
      return
    }

    if (method === 'DELETE') {
      contactsState.splice(index, 1)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Contacto eliminado' })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(contactsState[index])
    })
  })
}

test.describe('Admin panel operability', () => {
  test('persists settings after save and reload', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'Desktop-only coverage for the admin header/settings flow')

    await mockAdminShell(page)

    await page.goto('/admin')
    await expect(page.getByRole('button', { name: /Configuración del panel/i })).toBeVisible()

    await page.getByRole('button', { name: /Configuración del panel/i }).click()
    await expect(page.getByRole('heading', { name: /Configuración de cuenta/i })).toBeVisible()

    const notificationsSwitch = page.getByRole('switch', {
      name: /Habilitar notificaciones del panel/i
    })
    const saveButton = page.getByRole('button', { name: /Guardar configuración/i })

    await expect(notificationsSwitch).toHaveAttribute('aria-checked', 'true')
    await notificationsSwitch.click()
    await expect(notificationsSwitch).toHaveAttribute('aria-checked', 'false')

    await saveButton.click({ force: true })
    await expect(page.getByText(/Configuración guardada correctamente/i)).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: /Configuración del panel/i }).click()
    await expect(page.getByRole('heading', { name: /Configuración de cuenta/i })).toBeVisible()
    await expect(page.getByRole('switch', { name: /Habilitar notificaciones del panel/i })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  test('handles notification read and cleanup actions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'Desktop-only coverage for the admin header/notification flow')

    await mockAdminShell(page, {
      notifications: [
        {
          id: 'notification-1',
          title: 'Nueva postulación',
          message: 'Llegó una postulación nueva para revisar.',
          level: 'info',
          isRead: false,
          createdAt: '2026-06-01T10:00:00.000Z',
          action: {
            label: 'Ver postulación',
            type: 'APPLICATION',
            resourceId: 'application-1'
          }
        },
        {
          id: 'notification-2',
          title: 'Nuevo contacto',
          message: 'Hay un nuevo mensaje entrante.',
          level: 'success',
          isRead: false,
          createdAt: '2026-06-01T11:00:00.000Z'
        },
        {
          id: 'notification-3',
          title: 'Alerta de seguridad',
          message: 'Se detectó un acceso sospechoso.',
          level: 'warning',
          isRead: true,
          createdAt: '2026-06-01T12:00:00.000Z'
        }
      ]
    })

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin$/)
    await page.getByRole('button', { name: /Notificaciones del panel/i }).click()

    const notificationsDialog = page.getByRole('dialog', { name: /Notificaciones/i })
    await expect(notificationsDialog).toBeVisible()
    await expect(page.getByRole('button', { name: /Nuevas \(2\)/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Leidas \(1\)/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver postulación' })).toBeVisible()

    await page.getByRole('button', { name: /^Marcar leida$/i }).first().click()
    await expect(page.getByRole('button', { name: /Nuevas \(1\)/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Leidas \(2\)/i })).toBeVisible()

    await page.getByRole('button', { name: /Leidas \(2\)/i }).click()
    await expect(page.getByText(/Alerta de seguridad/i)).toBeVisible()

    await page.getByRole('button', { name: /Limpiar leidas/i }).click()
    await expect(page.getByRole('dialog', { name: /Limpiar notificaciones leídas/i })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, limpiar leídas' }).click()

    await expect(page.getByRole('dialog', { name: /Limpiar notificaciones leídas/i })).not.toBeVisible()
    await page.getByRole('button', { name: /Notificaciones del panel/i }).click()
    await expect(page.getByRole('button', { name: /Nuevas \(1\)/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Limpiar leidas/i })).toHaveCount(0)
  })

  test('deletes a single notification from the admin panel', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile'),
      'Desktop-only coverage for the admin notifications drawer'
    )

    await mockAdminShell(page, {
      notifications: [
        {
          id: 'notification-1',
          title: 'Nueva postulación',
          message: 'Llegó una postulación nueva para revisar.',
          level: 'info',
          isRead: false,
          createdAt: '2026-06-01T10:00:00.000Z'
        },
        {
          id: 'notification-2',
          title: 'Nuevo contacto',
          message: 'Hay un nuevo mensaje entrante.',
          level: 'success',
          isRead: true,
          createdAt: '2026-06-01T11:00:00.000Z'
        }
      ]
    })

    await page.goto('/admin')
    await page.getByRole('button', { name: /Notificaciones del panel/i }).click()

    const deleteButton = page.getByRole('button', {
      name: /Eliminar notificación: Nueva postulación/i
    })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    await expect(page.getByText(/Nueva postulación/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Nuevas \(0\)/i })).toBeVisible()
  })

  test('opens and deletes an application from the admin panel', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile'),
      'Desktop-only coverage for the admin tables and confirmation dialogs'
    )

    await mockAdminShell(page)

    await page.goto('/admin')
    await page.getByRole('button', { name: /^Postulaciones$/i }).click()

    const viewButton = page.getByRole('button', {
      name: /Ver detalle de postulación de Lucía Pérez/i
    })
    await expect(viewButton).toBeVisible()
    await viewButton.click()
    await expect(page.getByRole('heading', { name: /Lucía Pérez/i })).toBeVisible()
    await page.getByLabel(/Cerrar detalle de postulación/i).click()

    await page.getByRole('button', { name: /Eliminar postulación de Lucía Pérez/i }).click()
    await expect(page.getByRole('dialog', { name: /Eliminar postulación/i })).toBeVisible()
    await page.getByRole('button', { name: /^Eliminar postulación$/i }).click()

    await expect(page.getByRole('cell', { name: /No hay postulaciones registradas/i })).toBeVisible()
  })

  test('opens and deletes a contact from the admin panel', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile'),
      'Desktop-only coverage for the admin tables and confirmation dialogs'
    )

    await mockAdminShell(page)

    await page.goto('/admin')
    await page.getByRole('button', { name: /^Contactos$/i }).click()

    const viewButton = page.getByRole('button', {
      name: /Ver detalle de contacto de María Gómez/i
    })
    await expect(viewButton).toBeVisible()
    await viewButton.click()
    await expect(page.getByRole('heading', { name: /María Gómez/i })).toBeVisible()
    await page.getByLabel(/Cerrar detalle de contacto/i).click()

    await page.getByRole('button', { name: /Eliminar contacto de María Gómez/i }).click()
    await expect(page.getByRole('dialog', { name: /Eliminar contacto/i })).toBeVisible()
    await page.getByRole('button', { name: /^Eliminar contacto$/i }).click()

    await expect(page.getByRole('cell', { name: /No hay contactos registrados/i })).toBeVisible()
  })
})
