import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getSpringSessionMock = vi.fn()
const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()

vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))
vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))
vi.mock('@/lib/prisma', () => {
  throw new Error('The audit adapter must not load Prisma')
})
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))

const cookie = { Cookie: 'SESSIONID=admin-session' }

function request(query = '') {
  return new NextRequest(`https://spa-rrhh.test/api/admin/audit${query}`, { headers: cookie })
}

describe('/api/admin/audit Spring adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
    getSpringSessionMock.mockResolvedValue({ state: 'authorized' })
  })

  it('forwards validated filters, UTC dates, and pagination while preserving the Spring envelope', async () => {
    const payload = {
      items: [{ id: 'audit-1', action: 'vacancy.update', createdAt: '2026-07-22T12:00:00Z' }],
      pagination: { page: 2, limit: 1, total: 3, totalPages: 3 },
      filters: { actions: ['vacancy.update'], resourceTypes: ['vacancy'], actorEmails: ['admin@example.com'] }
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/admin/audit/route')
    const response = await GET(request('?actorEmail=admin%40example.com&action=vacancy.update&resourceType=vacancy&dateFrom=2026-07-22&dateTo=2026-07-22&page=2&limit=1'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(payload)
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=admin-session')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/audit?actorEmail=admin%40example.com&action=vacancy.update&resourceType=vacancy&dateFrom=2026-07-22&dateTo=2026-07-22&page=2&limit=1', {
      cache: 'no-store',
      headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' }
    })
  })

  it('forwards an authorized rotated Spring session to the audit request and response', async () => {
    const rotatedCookie = 'SESSIONID=rotated-session; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {
        userId: 'admin-1',
        email: 'admin@example.com',
        nombreUsuario: 'Admin',
        rol: { id: 'role-1', nombre: 'Administrador', permisos: ['admin:access'] }
      },
      setCookie: rotatedCookie
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), {
      headers: { 'Content-Type': 'application/json' }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/audit/route')

    const response = await GET(request())

    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/audit?page=1&limit=20', {
      cache: 'no-store',
      headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=rotated-session' }
    })
    expect(response.headers.get('Set-Cookie')).toBe(rotatedCookie)
  })

  it('returns the existing validation envelope before proxying invalid audit queries', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/audit/route')

    const response = await GET(request('?page=0&limit=51'))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'Datos inválidos',
      details: [
        { field: 'page', message: 'Too small: expected number to be >=1' },
        { field: 'limit', message: 'Too big: expected number to be <=50' }
      ]
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ state: 'anonymous' }, 401, 'No autorizado'],
    [{ state: 'forbidden' }, 403, 'No autorizado'],
    [{ state: 'unavailable' }, 503, 'Spring backend unavailable']
  ])('maps Spring session failures without proxying', async (failedSession, status, error) => {
    getSpringSessionMock.mockResolvedValue(failedSession)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/audit/route')

    const response = await GET(request())

    expect(response.status).toBe(status)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves Spring 500 error envelopes', async () => {
    const payload = { error: 'Internal server error' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 500, headers: { 'Content-Type': 'application/json' } })))
    const { GET } = await import('@/app/api/admin/audit/route')

    const response = await GET(request())

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(payload)
  })

  it('returns a no-store 503 when Spring cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))
    const { GET } = await import('@/app/api/admin/audit/route')

    const response = await GET(request())

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Spring backend unavailable' })
  })
})
