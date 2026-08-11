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

const notificationId = 'notification-1'
const cookie = { Cookie: 'SESSIONID=admin-session' }

function request(method: 'PATCH' | 'DELETE', body?: string) {
  return new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, {
    method,
    body,
    headers: { ...cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) }
  })
}

const params = { params: Promise.resolve({ id: notificationId }) }

describe('/api/admin/notifications/[id] Spring adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
    getSpringSessionMock.mockResolvedValue({ state: 'authorized' })
    rejectIfUntrustedOriginMock.mockReturnValue(null)
  })

  it('forwards an authorized PATCH unchanged and preserves the Spring DTO', async () => {
    const payload = { isRead: true }
    const updated = { id: notificationId, title: 'New application', level: 'success', isRead: true }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')

    const response = await PATCH(request('PATCH', JSON.stringify(payload)), params)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(updated)
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/notifications/notification-1', {
      method: 'PATCH', body: JSON.stringify(payload), cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' }
    })
  })

  it.each([
    ['PATCH', 'spring-preferences=dark; Path=/; HttpOnly; SameSite=Lax'],
    ['DELETE', 'spring-preferences=light; Path=/; HttpOnly; SameSite=Lax']
  ])('forwards the rotated validation session and appends cookies for %s', async (_method, upstreamCookie) => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', setCookie: validationCookie })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'ok' }), {
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': upstreamCookie }
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { PATCH, DELETE } = await import('@/app/api/admin/notifications/[id]/route')

    const response = _method === 'PATCH'
      ? await PATCH(request('PATCH', JSON.stringify({ isRead: true })), params)
      : await DELETE(request('DELETE'), params)

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ Cookie: 'SESSIONID=S1' })
    }))
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
    expect(response.headers.get('Set-Cookie')).toContain(upstreamCookie)
  })

  it.each([
    ['malformed PATCH body', 400],
    ['untrusted PATCH origin', 403]
  ])('keeps the rotated validation cookie on local %s rejections without proxying', async (_name, status) => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', setCookie: validationCookie })
    rejectIfUntrustedOriginMock.mockReturnValue(_name === 'untrusted PATCH origin'
      ? new Response(JSON.stringify({ error: 'Origen no permitido' }), { status: 403 })
      : null)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')

    const response = _name === 'malformed PATCH body'
      ? await PATCH(request('PATCH', '{'), params)
      : await PATCH(request('PATCH', JSON.stringify({ isRead: true })), params)

    expect(response.status).toBe(status)
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards a successful DELETE message unchanged', async () => {
    const deleted = { message: 'Notificación eliminada' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(deleted), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')

    const response = await DELETE(request('DELETE'), params)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual(deleted)
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/notifications/notification-1', {
      method: 'DELETE', cache: 'no-store',
      headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' }
    })
  })

  it('returns a local no-store 400 for malformed PATCH JSON without proxying', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')

    const response = await PATCH(request('PATCH', '{'), params)

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error: 'Malformed request body' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('relays the rotated validation cookie for a parsed-invalid PATCH DTO without proxying', async () => {
    const validationCookie = 'SESSIONID=S1; Path=/; HttpOnly; SameSite=Lax'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', setCookie: validationCookie })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { PATCH } = await import('@/app/api/admin/notifications/[id]/route')

    const response = await PATCH(request('PATCH', JSON.stringify({ isRead: 'true' })), params)

    expect(response.status).toBe(400)
    expect(response.headers.get('Set-Cookie')).toContain(validationCookie)
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
    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')

    const response = await DELETE(request('DELETE'), params)

    expect(response.status).toBe(status)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ error })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
