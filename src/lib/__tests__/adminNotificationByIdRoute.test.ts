import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getSpringSessionMock = vi.fn()
const rejectIfUntrustedOriginMock = vi.fn()
const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))
vi.mock('@/lib/csrf', () => ({ rejectIfUntrustedOrigin: rejectIfUntrustedOriginMock }))
vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
vi.stubGlobal('fetch', fetchMock)

describe('/api/admin/notifications/[id]', () => {
  const notificationId = 'cmc7q8v1r0000v5r4f9k0m2n3'

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {
        userId: 'admin-1',
        email: 'admin@example.com',
        nombreUsuario: 'QA Admin',
        rol: { id: 'role-1', nombre: 'USER', permisos: ['admin:access'] }
      }
    })
    rejectIfUntrustedOriginMock.mockReturnValue(null)
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
  })

  it('forwards read-state updates to Spring and preserves the notification DTO', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: notificationId, title: 'Nuevo CV', message: 'Ana aplicó', level: 'success', isRead: true, createdAt: '2026-07-21T12:00:00.000Z' }), { status: 200 })
    )

    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')
    const request = new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true })
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: notificationId }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ id: notificationId, level: 'success', isRead: true })
    expect(fetchMock).toHaveBeenCalledWith(
      `https://spring.example.com/api/v1/admin/notifications/${notificationId}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ isRead: true }) })
    )
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=admin-session')
  })

  it('preserves Spring not-found envelopes when deleting a notification', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Notificación no encontrada' }), { status: 404 }))

    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')
    const response = await DELETE(
        new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, { method: 'DELETE', headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session' } }),
      { params: Promise.resolve({ id: notificationId }) }
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Notificación no encontrada' })
  })

  it('maps an unreachable Spring backend to the browser 503 envelope', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')
    const response = await DELETE(
        new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, { method: 'DELETE', headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session' } }),
      { params: Promise.resolve({ id: notificationId }) }
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Spring backend unavailable' })
  })

  it('authorizes before CSRF, route validation, or JSON parsing for anonymous PATCH requests', async () => {
    rejectIfUntrustedOriginMock.mockReturnValue(new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 }))

    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')
    const response = await PATCH(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications/not-an-id', {
        method: 'PATCH',
        headers: { origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
        body: '{'
      }),
      { params: Promise.resolve({ id: 'not-an-id' }) }
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'No autorizado' })
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('returns 403 before route validation for authenticated non-admin DELETE requests', async () => {
    getSpringSessionMock.mockResolvedValue({ state: 'forbidden' })

    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')
    const response = await DELETE(
        new NextRequest('https://spa-rrhh.test/api/admin/notifications/not-an-id', { method: 'DELETE', headers: { cookie: 'SESSIONID=limited-session' } }),
      { params: Promise.resolve({ id: 'not-an-id' }) }
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'No autorizado' })
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('preserves the legacy malformed JSON 500 envelope for authorized PATCH requests', async () => {
    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')
    const response = await PATCH(
      new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session', 'Content-Type': 'application/json' },
        body: '{'
      }),
      { params: Promise.resolve({ id: notificationId }) }
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Error al actualizar notificación' })
  })
})
