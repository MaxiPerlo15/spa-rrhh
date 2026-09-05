import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getSpringSessionMock = vi.fn()
const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()
const rejectIfUntrustedOriginMock = vi.fn()

vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))
vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))
vi.mock('@/lib/csrf', () => ({ rejectIfUntrustedOrigin: rejectIfUntrustedOriginMock }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))

const session = {
  state: 'authorized',
  user: {
    userId: 'admin-1',
    email: 'admin@example.com',
    nombreUsuario: 'Admin',
    rol: { id: 'role-1', nombre: 'ADMIN', permisos: ['admin:access'] }
  }
} as const
const cookie = { Cookie: 'SESSIONID=admin-session' }

function request(url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url, {
    ...init,
    headers: { ...cookie, ...init.headers }
  })
}

describe('/api/admin/notifications collection adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
    getSpringSessionMock.mockResolvedValue(session)
    rejectIfUntrustedOriginMock.mockReturnValue(null)
  })

  it('forwards authorized paginated GETs unchanged with session auth and no-store', async () => {
    const payload = {
      items: [{ id: 'notification-1', isRead: false }],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 }
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(request('http://localhost:3000/api/admin/notifications?view=unread&page=2&limit=20'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(payload)
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=admin-session')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/admin/notifications?view=unread&page=2&limit=20',
      {
        cache: 'no-store',
        headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' }
      }
    )
  })

  it('forwards the rotated validation session and appends validation and upstream cookies', async () => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    const upstreamCookie = 'spring-preferences=dark; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ ...session, setCookie: validationCookie })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }), {
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': upstreamCookie }
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')

    const response = await GET(request('http://localhost:3000/api/admin/notifications?view=all&page=1&limit=20'))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/admin/notifications?view=all&page=1&limit=20',
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'SESSIONID=S1' }) })
    )
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
    expect(response.headers.get('Set-Cookie')).toContain(upstreamCookie)
  })

  it.each([
    ['invalid GET query', 400],
    ['untrusted POST origin', 403]
  ])('keeps the rotated validation cookie on local %s rejections without proxying', async (_name, status) => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ ...session, setCookie: validationCookie })
    rejectIfUntrustedOriginMock.mockReturnValue(
      new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 })
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET, POST } = await import('@/app/api/admin/notifications/route')

    const response = _name === 'invalid GET query'
      ? await GET(request('http://localhost:3000/api/admin/notifications?view=invalid'))
      : await POST(request('http://localhost:3000/api/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({ title: 'Title', message: 'Message' })
      }))

    expect(response.status).toBe(status)
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves POST creation, CSRF protection, and the Spring 201 DTO casing', async () => {
    const payload = {
      title: 'New application',
      message: 'Ada applied.',
      level: 'SUCCESS',
      action: { label: 'Review', type: 'APPLICATION', resourceId: 'ckz1234567890123456789012' }
    }
    const created = { id: 'notification-1', ...payload, level: 'success', isRead: false }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(request('http://localhost:3000/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(created)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/admin/notifications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Api-Key': 'test-token',
          Cookie: 'SESSIONID=admin-session'
        }
      })
    )
  })

  it('returns a no-store 400 for malformed POST JSON before proxying', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(request('http://localhost:3000/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Malformed request body' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('relays the rotated validation cookie for a parsed-invalid POST DTO without proxying', async () => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ ...session, setCookie: validationCookie })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/admin/notifications/route')

    const response = await POST(request('http://localhost:3000/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', message: 'Message' })
    }))

    expect(response.status).toBe(400)
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects untrusted POST origins before proxying', async () => {
    rejectIfUntrustedOriginMock.mockReturnValue(
      new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 })
    )
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(request('http://localhost:3000/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: 'Title', message: 'Message' })
    }))

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards bulk read deletion and rejects invalid views locally', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deletedCount: 3 })))
    vi.stubGlobal('fetch', fetchMock)
    const { DELETE } = await import('@/app/api/admin/notifications/route')
    const deleted = await DELETE(request('http://localhost:3000/api/admin/notifications?view=read', { method: 'DELETE' }))
    const invalid = await DELETE(request('http://localhost:3000/api/admin/notifications?view=unread', { method: 'DELETE' }))

    await expect(deleted.json()).resolves.toEqual({ deletedCount: 3 })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/admin/notifications?view=read',
      { method: 'DELETE', cache: 'no-store', headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' } }
    )
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ error: 'Parámetro view inválido' })
  })

  it.each([
    [{ state: 'anonymous' }, 401, 'No autorizado'],
    [{ state: 'forbidden' }, 403, 'No autorizado'],
    [{ state: 'unavailable' }, 503, 'Spring backend unavailable']
  ])('maps Spring session failures to browser-safe errors', async (failedSession, status, error) => {
    getSpringSessionMock.mockResolvedValue(failedSession)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(request('http://localhost:3000/api/admin/notifications'))

    expect(response.status).toBe(status)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the existing unauthenticated 401 envelope', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(new NextRequest('https://spa-rrhh.test/api/admin/notifications'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('authorizes before CSRF or validation for an authenticated non-admin', async () => {
    getSpringSessionMock.mockResolvedValue({ state: 'forbidden' })
    const { POST } = await import('@/app/api/admin/notifications/route')
    const response = await POST(new NextRequest('https://spa-rrhh.test/api/admin/notifications', {
      method: 'POST',
      headers: { cookie: 'SESSIONID=limited-session', 'Content-Type': 'application/json' },
      body: '{}'
    }))

    expect(response.status).toBe(403)
    expect(rejectIfUntrustedOriginMock).not.toHaveBeenCalled()
  })

  it('preserves stale-session expiry cookies on the anonymous 401 response', async () => {
    const expiredCookie = 'SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ state: 'anonymous', setCookie: expiredCookie })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(request('http://localhost:3000/api/admin/notifications'))

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Set-Cookie')).toBe(expiredCookie)
    await expect(response.json()).resolves.toEqual({ error: 'No autorizado' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a no-store 503 when Spring cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))
    const { GET } = await import('@/app/api/admin/notifications/route')
    const response = await GET(request('http://localhost:3000/api/admin/notifications'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Spring backend unavailable' })
  })

  it('preserves upstream authorization failures and reports missing Spring as 503', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('@/app/api/admin/notifications/route')
    const forbidden = await GET(request('http://localhost:3000/api/admin/notifications'))
    expect(forbidden.status).toBe(403)
    await expect(forbidden.json()).resolves.toEqual({ error: 'forbidden' })

    getBackendUrlMock.mockReturnValue(null)
    const unavailable = await GET(request('http://localhost:3000/api/admin/notifications'))
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get('Cache-Control')).toBe('no-store')
    await expect(unavailable.json()).resolves.toEqual({ error: 'Spring backend not configured' })
  })
})
