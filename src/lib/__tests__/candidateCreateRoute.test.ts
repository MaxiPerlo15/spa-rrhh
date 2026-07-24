import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn(() => null)
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

describe('/api/admin/candidates POST', () => {
  const payload = {
    candidateName: 'Maria Garcia',
    email: 'maria@test.com',
    phone: '+54 11 9999-0000',
    notes: 'Spontaneous apply'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('proxyea el POST a Spring y retorna 201 con el DTO', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: 'cand-123',
          personKey: 'abc123',
          applicationId: 'app-456'
        }),
        { status: 201 }
      )
    )

    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual({
      candidateId: 'cand-123',
      personKey: 'abc123',
      applicationId: 'app-456'
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/candidates',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('retorna 401 cuando no hay sesión admin', async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('retorna 409 cuando Spring retorna DUPLICATE_CANDIDATE', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Duplicado', code: 'DUPLICATE_CANDIDATE' }),
        { status: 409 }
      )
    )

    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe('DUPLICATE_CANDIDATE')
  })

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    vi.mocked(getBackendUrl).mockReturnValueOnce(null)

    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(503)
  })
})
