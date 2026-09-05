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

describe('/api/admin/notifications', () => {
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

  it('forwards pagination to Spring and preserves the list response without caching', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'cmc7q8v1r0000v5r4f9k0m2n3', title: 'Nuevo CV', message: 'Ana aplicó', level: 'success', isRead: false, createdAt: '2026-07-21T12:00:00.000Z' }], pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } }), { status: 200 }))

    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(new NextRequest('https://spa-rrhh.test/api/admin/notifications?view=unread&page=2&limit=10', { headers: { cookie: 'SESSIONID=admin-session' } }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ pagination: { page: 2, limit: 10, total: 11, totalPages: 2 }, items: [{ level: 'success', isRead: false }] })
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=admin-session')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/notifications?view=unread&page=2&limit=10', expect.objectContaining({ cache: 'no-store' }))
  })

  it('preserves the 201 notification DTO created by Spring', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'cmc7q8v1r0000v5r4f9k0m2n3', title: 'Nuevo CV', message: 'Ana aplicó', level: 'success', isRead: false, createdAt: '2026-07-21T12:00:00.000Z' }), { status: 201 }))

    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(new NextRequest('https://spa-rrhh.test/api/admin/notifications', { method: 'POST', headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Nuevo CV', message: 'Ana aplicó', level: 'SUCCESS' }) }))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ level: 'success', isRead: false })
  })

  it('keeps the existing unauthenticated 401 envelope', async () => {
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(new NextRequest('https://spa-rrhh.test/api/admin/notifications'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'No autorizado' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('authorizes before rejecting an anonymous malformed POST request', async () => {
    rejectIfUntrustedOriginMock.mockReturnValue(new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 }))

    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications', {
        method: 'POST',
        headers: { origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
        body: '{'
      })
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'No autorizado' })
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('returns 403 before CSRF or validation for an authenticated non-admin', async () => {
    getSpringSessionMock.mockResolvedValue({ state: 'forbidden' })

    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications', {
        method: 'POST',
        headers: { cookie: 'SESSIONID=limited-session', 'Content-Type': 'application/json' },
        body: '{}'
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'No autorizado' })
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('maps an unavailable Spring session check to the browser 503 envelope before validation', async () => {
    getSpringSessionMock.mockResolvedValue({ state: 'unavailable' })

    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications', {
        method: 'POST',
        headers: { cookie: 'SESSIONID=unavailable-session', 'Content-Type': 'application/json' },
        body: '{}'
      })
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Spring backend unavailable' })
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('preserves the legacy malformed JSON 500 envelope for an authorized POST', async () => {
    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications', {
        method: 'POST',
        headers: { origin: 'https://spa-rrhh.test', cookie: 'SESSIONID=admin-session', 'Content-Type': 'application/json' },
        body: '{'
      })
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Error al crear notificación' })
  })

  it('adds no-store to authorized CSRF rejections', async () => {
    rejectIfUntrustedOriginMock.mockReturnValue(new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 }))

    const { DELETE } = await import('@/app/api/admin/notifications/route')
    const response = await DELETE(
      new NextRequest('https://spa-rrhh.test/api/admin/notifications?view=read', {
        method: 'DELETE',
        headers: { origin: 'https://untrusted.example', cookie: 'SESSIONID=admin-session' }
      })
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Origen no permitido' })
  })

  it('preserves Spring authorization failures and reports missing Spring as 503', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }))
    const { GET } = await import('@/app/api/admin/notifications/route')
    const forbidden = await GET(new NextRequest('https://spa-rrhh.test/api/admin/notifications', { headers: { cookie: 'SESSIONID=admin-session' } }))
    expect(forbidden.status).toBe(403)
    expect(await forbidden.json()).toEqual({ error: 'forbidden' })

    getBackendUrlMock.mockReturnValue(null)
    const unavailable = await GET(new NextRequest('https://spa-rrhh.test/api/admin/notifications', { headers: { cookie: 'SESSIONID=admin-session' } }))
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get('Cache-Control')).toBe('no-store')
    expect(await unavailable.json()).toEqual({ error: 'Spring backend not configured' })
  })
})
