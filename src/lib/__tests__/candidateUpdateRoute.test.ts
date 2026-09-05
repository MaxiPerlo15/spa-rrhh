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

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('/api/admin/candidates/[id] PATCH', () => {
  const payload = {
    candidateName: 'Maria G.',
    email: 'newemail@test.com',
    phone: '+54 11 1111-2222'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('proxyea el PATCH a Spring y retorna 200 con el resultado', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: VALID_UUID,
          applications: [{ id: 'app-1', submittedAt: '2026-01-01T00:00:00Z', status: 'PENDING' }]
        }),
        { status: 200, headers: { 'Set-Cookie': 'SESSIONID=rotated; Path=/; HttpOnly' } }
      )
    )

    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'SESSIONID=original; XSRF-TOKEN=token',
        'X-Forwarded-For': '203.0.113.10, proxy',
        'User-Agent': 'Candidate test agent'
      }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.candidateId).toBe(VALID_UUID)
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://localhost:8080/api/v1/candidates/${VALID_UUID}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Cookie: 'SESSIONID=original; XSRF-TOKEN=token',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'Candidate test agent'
        })
      })
    )
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated')
  })

  it('relays Spring 403 and its cookie without local authorization', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Set-Cookie': 'SESSIONID=rotated; Path=/; HttpOnly' }
    }))
    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' })
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated')
  })

  it('relays Spring anonymous 401 body, status, and cookie', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Set-Cookie': 'SESSIONID=expired; Max-Age=0; Path=/; HttpOnly' }
    }))
    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'unauthorized' })
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=expired')
  })

  it('retorna 409 cuando Spring retorna CANDIDATE_IDENTITY_CONFLICT', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Conflicto', code: 'CANDIDATE_IDENTITY_CONFLICT' }),
        { status: 409 }
      )
    )

    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe('CANDIDATE_IDENTITY_CONFLICT')
  })

  it('redacts a non-JSON Spring error while preserving its status and cookie', async () => {
    const sentinel = 'SENTINEL: Spring database password=do-not-leak'
    fetchSpy.mockResolvedValueOnce(new Response(sentinel, {
      status: 503,
      headers: { 'Set-Cookie': 'SESSIONID=expired; Max-Age=0; Path=/' }
    }))

    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const response = await PATCH(new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }
    }), { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Error al actualizar candidato' })
    expect(JSON.stringify(body)).not.toContain(sentinel)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=expired')
    expect(loggerErrorMock).toHaveBeenLastCalledWith(
      'Spring backend returned non-JSON candidate update error',
      expect.objectContaining({ message: 'Spring candidate update failed' }),
      { category: 'spring_candidate_mutation_failure', status: 503 }
    )
  })

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    vi.mocked(getBackendUrl).mockReturnValueOnce(null)

    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })

    expect(response.status).toBe(503)
  })
})
