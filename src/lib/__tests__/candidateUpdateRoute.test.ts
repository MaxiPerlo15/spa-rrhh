import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const auditAdminActionMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: auditAdminActionMock
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn(() => null)
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

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
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: VALID_UUID,
          applications: [{ id: 'app-1', submittedAt: '2026-01-01T00:00:00Z', status: 'PENDING' }]
        }),
        { status: 200 }
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

    expect(response.status).toBe(200)
    expect(body.candidateId).toBe(VALID_UUID)
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://localhost:8080/api/v1/candidates/${VALID_UUID}`,
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('retorna 401 cuando no hay sesión admin', async () => {
    authMock.mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })

    expect(response.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(auditAdminActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        action: 'candidate.update',
        resourceType: 'candidate',
        resourceId: VALID_UUID,
        outcome: 'DENIED'
      })
    )
  })

  it('retorna 409 cuando Spring retorna CANDIDATE_IDENTITY_CONFLICT', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
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

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })
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
