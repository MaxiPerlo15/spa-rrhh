import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const getSpringSessionMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/springSession', () => ({
  getSpringSession: getSpringSessionMock
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn(() => null)
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')
const getSetCookies = (response: Response) => (
  response.headers as Headers & { getSetCookie: () => string[] }
).getSetCookie()

describe('/api/contacts/[id] GET', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('devuelve el contacto desde Spring con campos concretos', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
    const springContact = {
      id: 'cmdbcontactstatus0000000001',
      name: 'Carlos Lopez',
      email: 'carlos@example.com',
      phone: '+54 11 9876-5432',
      subject: 'Reclutamiento',
      message: 'Quiero postularme',
      status: 'PENDING',
      createdAt: '2026-03-01T08:00:00.000Z'
    }

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(springContact), { status: 200 })
    )

    const { GET } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001')

    const response = await GET(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      id: 'cmdbcontactstatus0000000001',
      name: 'Carlos Lopez',
      email: 'carlos@example.com',
      phone: '+54 11 9876-5432',
      subject: 'Reclutamiento',
      message: 'Quiero postularme',
      status: 'PENDING',
      createdAt: '2026-03-01T08:00:00.000Z'
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts/cmdbcontactstatus0000000001',
      expect.objectContaining({ method: 'GET' })
    )
  })
})

describe('/api/contacts/[id] PATCH', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly'
    })
  })

  it('rechaza una transición inválida cuando Spring retorna 400', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'ADMIN',
        id: 'admin-1',
        email: 'admin@test.com'
      }
    })

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Transición inválida de contacto', code: 'INVALID_CONTACT_TRANSITION' }),
        { status: 400, headers: { 'Set-Cookie': 'XSRF-TOKEN=failed-patch; Path=/' } }
      )
    )

    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESPONDED' }),
      headers: {
        'content-type': 'application/json',
        Cookie: 'SESSIONID=original-session'
      }
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({ code: 'INVALID_CONTACT_TRANSITION' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts/cmdbcontactstatus0000000001',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'SESSIONID=rotated-session'
        }
      })
    )
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=original-session')
    expect(getSetCookies(response)).toEqual([
      'SESSIONID=rotated-session; Path=/; HttpOnly',
      'XSRF-TOKEN=failed-patch; Path=/'
    ])
  })

  it('retorna 401 cuando no hay sesión de admin', async () => {
    authMock.mockResolvedValue(null)

    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESPONDED' }),
      headers: { 'content-type': 'application/json' }
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(['PATCH', 'DELETE'])('%s retorna 401 y no muta sin SESSIONID', async method => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    const { PATCH, DELETE } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'PATCH' ? JSON.stringify({ status: 'RESPONDED' }) : undefined
    })

    const response = await (method === 'PATCH' ? PATCH : DELETE)(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })

    expect(response.status).toBe(401)
    expect(getSpringSessionMock).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['PATCH', 'anonymous', 401], ['PATCH', 'forbidden', 403], ['PATCH', 'unavailable', 503],
    ['DELETE', 'anonymous', 401], ['DELETE', 'forbidden', 403], ['DELETE', 'unavailable', 503]
  ])('%s does not mutate when the Spring session is %s', async (method, state, status) => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    getSpringSessionMock.mockResolvedValue({ state })
    const { PATCH, DELETE } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method, headers: { Cookie: 'SESSIONID=original-session', 'content-type': 'application/json' },
      body: method === 'PATCH' ? JSON.stringify({ status: 'RESPONDED' }) : undefined
    })

    const response = await (method === 'PATCH' ? PATCH : DELETE)(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })

    expect(response.status).toBe(status)
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=original-session')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it.each(['PATCH', 'DELETE'] as const)('%s excludes client context from Spring requests', async method => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'cmdbcontactstatus0000000001', name: 'Carlos Lopez', email: 'carlos@example.com',
      phone: '+54 11 9876-5432', subject: 'Reclutamiento', message: 'Quiero postularme',
      status: 'RESPONDED', createdAt: '2026-03-01T08:00:00.000Z'
    }), { status: 200 }))
    const { PATCH, DELETE } = await import('@/app/api/contacts/[id]/route')
    const response = await (method === 'PATCH' ? PATCH : DELETE)(new NextRequest(
      'http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
        method,
        headers: {
          Cookie: 'SESSIONID=original-session',
          'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
          'User-Agent': 'Vitest'
        },
        ...(method === 'PATCH' ? { body: JSON.stringify({ status: 'RESPONDED' }) } : {})
      }
    ), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(200)
    const springHeaders = fetchSpy.mock.calls[0][1]?.headers
    expect(springHeaders).toEqual(method === 'PATCH'
      ? { 'Content-Type': 'application/json', Cookie: 'SESSIONID=rotated-session' }
      : { Cookie: 'SESSIONID=rotated-session' })
    expect(springHeaders).not.toHaveProperty('X-Forwarded-For')
    expect(springHeaders).not.toHaveProperty('User-Agent')
  })

  it('relays ordered cookies on successful contact mutations', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'cmdbcontactstatus0000000001', name: 'Carlos', email: 'carlos@example.com', phone: null,
        subject: 'Recruitment', message: 'Message', status: 'RESPONDED', createdAt: '2026-03-01T08:00:00.000Z'
      }), { status: 200, headers: { 'Set-Cookie': 'XSRF-TOKEN=patched; Path=/' } }))
      .mockResolvedValueOnce(new Response(null, {
        status: 200, headers: { 'Set-Cookie': 'XSRF-TOKEN=deleted; Path=/' }
      }))
    const { PATCH, DELETE } = await import('@/app/api/contacts/[id]/route')
    const params = { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) }
    const patch = await PATCH(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH', headers: { Cookie: 'SESSIONID=original-session' }, body: JSON.stringify({ status: 'RESPONDED' })
    }), params)
    const deletion = await DELETE(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'DELETE', headers: { Cookie: 'SESSIONID=original-session' }
    }), params)

    expect(getSetCookies(patch)).toEqual(['SESSIONID=rotated-session; Path=/; HttpOnly', 'XSRF-TOKEN=patched; Path=/'])
    expect(getSetCookies(deletion)).toEqual(['SESSIONID=rotated-session; Path=/; HttpOnly', 'XSRF-TOKEN=deleted; Path=/'])
  })

  it('relays authorization cookies when PATCH transport fails', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy.mockRejectedValueOnce(new Error('Spring unavailable'))
    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const response = await PATCH(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      headers: { Cookie: 'SESSIONID=original-session' },
      body: JSON.stringify({ status: 'RESPONDED' })
    }), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(503)
    expect(getSetCookies(response)).toEqual(['SESSIONID=rotated-session; Path=/; HttpOnly'])
  })

  it.each(['PATCH', 'DELETE'] as const)('relays the Spring session cookie when %s is denied anonymously', async method => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    getSpringSessionMock.mockResolvedValue({
      state: 'anonymous', setCookie: 'SESSIONID=expired; Max-Age=0; Path=/'
    })
    const { PATCH, DELETE } = await import('@/app/api/contacts/[id]/route')
    const response = await (method === 'PATCH' ? PATCH : DELETE)(new NextRequest(
      'http://localhost/api/contacts/cmdbcontactstatus0000000001', {
        method, headers: { Cookie: 'SESSIONID=original-session' },
        ...(method === 'PATCH' ? { body: JSON.stringify({ status: 'RESPONDED' }) } : {})
      }
    ), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(getSetCookies(response)).toEqual(['SESSIONID=expired; Max-Age=0; Path=/'])
  })

  it('relays the authorization cookie when DELETE transport fails', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy.mockRejectedValueOnce(new Error('Spring unavailable'))
    const { DELETE } = await import('@/app/api/contacts/[id]/route')
    const response = await DELETE(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'DELETE', headers: { Cookie: 'SESSIONID=original-session' }
    }), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(503)
    expect(getSetCookies(response)).toEqual(['SESSIONID=rotated-session; Path=/; HttpOnly'])
  })

  it('relays ordered cookies when DELETE receives a Spring text failure', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy.mockResolvedValueOnce(new Response('Contact locked', {
      status: 409, headers: { 'Set-Cookie': 'XSRF-TOKEN=failed-delete; Path=/' }
    }))
    const { DELETE } = await import('@/app/api/contacts/[id]/route')
    const response = await DELETE(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'DELETE', headers: { Cookie: 'SESSIONID=original-session' }
    }), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: 'Contact locked' })
    expect(getSetCookies(response)).toEqual([
      'SESSIONID=rotated-session; Path=/; HttpOnly',
      'XSRF-TOKEN=failed-delete; Path=/'
    ])
  })

  it('relays ordered cookies when PATCH cannot parse a Spring success body', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
    fetchSpy.mockResolvedValueOnce(new Response('not json', {
      status: 200, headers: { 'Set-Cookie': 'XSRF-TOKEN=parse-error; Path=/' }
    }))
    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const response = await PATCH(new NextRequest('http://localhost/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      headers: { Cookie: 'SESSIONID=original-session' },
      body: JSON.stringify({ status: 'RESPONDED' })
    }), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(500)
    expect(getSetCookies(response)).toEqual([
      'SESSIONID=rotated-session; Path=/; HttpOnly',
      'XSRF-TOKEN=parse-error; Path=/'
    ])
  })
})
