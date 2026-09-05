import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn(() => null)
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')
const loggerErrorMock = vi.fn()

vi.mock('@/lib/logger', () => ({
  logger: { error: loggerErrorMock }
}))

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
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: 'cand-123',
          personKey: 'abc123',
          applicationId: 'app-456'
        }),
        { status: 201, headers: { 'Set-Cookie': 'SESSIONID=rotated; Path=/; HttpOnly' } }
      )
    )

    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'SESSIONID=original; XSRF-TOKEN=token',
        'X-Forwarded-For': '203.0.113.10, proxy',
        'User-Agent': 'Candidate test agent'
      }
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
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Cookie: 'SESSIONID=original; XSRF-TOKEN=token',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'Candidate test agent'
        })
      })
    )
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated')
  })

  it('relays Spring 401 and its cookie without performing local authorization or auditing', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Set-Cookie': 'SESSIONID=expired; Max-Age=0; Path=/' }
    }))
    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=expired')
  })

  it('relays a Spring cookie when a successful response body cannot be parsed', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('not-json', {
      status: 201,
      headers: { 'Set-Cookie': 'SESSIONID=rotated; Path=/; HttpOnly' }
    }))
    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated')
  })

  it('retorna 409 cuando Spring retorna DUPLICATE_CANDIDATE', async () => {
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

  it('redacts a non-JSON Spring error while preserving its status and cookie', async () => {
    const sentinel = 'SENTINEL: Spring database password=do-not-leak'
    fetchSpy.mockResolvedValueOnce(new Response(sentinel, {
      status: 502,
      headers: { 'Set-Cookie': 'SESSIONID=expired; Max-Age=0; Path=/' }
    }))

    const { POST } = await import('@/app/api/admin/candidates/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }
    }))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toEqual({ error: 'Error al registrar candidato manual' })
    expect(JSON.stringify(body)).not.toContain(sentinel)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=expired')
    expect(loggerErrorMock).toHaveBeenLastCalledWith(
      'Spring backend returned non-JSON candidate create error',
      expect.objectContaining({ message: 'Spring candidate create failed' }),
      { category: 'spring_candidate_mutation_failure', status: 502 }
    )
  })

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
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
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
