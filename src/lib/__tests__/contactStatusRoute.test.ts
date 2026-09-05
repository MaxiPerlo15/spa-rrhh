import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const auditAdminActionMock = vi.fn()
const getSpringSessionMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: auditAdminActionMock
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

describe('/api/contacts/[id] GET', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: {}
    })
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
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: {}
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
        { status: 400 }
      )
    )

    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESPONDED' }),
      headers: {
        'content-type': 'application/json',
        Cookie: 'SESSIONID=spring-admin-session'
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
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('retorna 401 cuando no hay sesión de admin', async () => {
    getSpringSessionMock.mockResolvedValueOnce({
      state: 'anonymous',
      setCookie: 'SESSIONID=; Max-Age=0; Path=/; HttpOnly'
    })

    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const request = new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESPONDED' }),
      headers: { 'content-type': 'application/json', Cookie: 'SESSIONID=expired-session' }
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' })
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('forwards a rotated Spring session for contact status updates without a Prisma audit', async () => {
    authMock.mockResolvedValue(null)
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'cmdbcontactstatus0000000001',
      name: 'Carlos Lopez',
      email: 'carlos@example.com',
      phone: '+54 11 9876-5432',
      subject: 'Reclutamiento',
      message: 'Quiero postularme',
      status: 'RESPONDED',
      createdAt: '2026-03-01T08:00:00.000Z'
    }), { status: 200 }))

    const { PATCH } = await import('@/app/api/contacts/[id]/route')
    const response = await PATCH(new NextRequest('http://localhost:3000/api/contacts/cmdbcontactstatus0000000001', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', Cookie: 'SESSIONID=active-session' },
      body: JSON.stringify({ status: 'RESPONDED' })
    }), { params: Promise.resolve({ id: 'cmdbcontactstatus0000000001' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated-session')
    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=active-session')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts/cmdbcontactstatus0000000001',
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'SESSIONID=rotated-session' }) })
    )
    expect(auditAdminActionMock).not.toHaveBeenCalled()
  })
})
