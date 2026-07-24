import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const rejectIfUntrustedOriginMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: rejectIfUntrustedOriginMock
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('/api/admin/candidates/[id] PATCH', () => {
  const payload = {
    candidateName: 'Ana Gomez',
    email: 'ana.gomez@example.com',
    phone: '+54 9 11 9999-9999'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    rejectIfUntrustedOriginMock.mockReturnValue(null)
  })

  it('rechaza acceso sin autenticación de admin', async () => {
    authMock.mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/admin/candidates/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/admin/candidates/${VALID_UUID}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: VALID_UUID }) })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: 'No autorizado' })
  })

  it('rechaza modificaciones que colisionan con otra identidad existente', async () => {
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', email: 'admin@example.com', role: 'ADMIN' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Los nuevos datos de contacto ya pertenecen a otro candidato registrado.',
          code: 'CANDIDATE_IDENTITY_CONFLICT'
        }),
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
    expect(body).toMatchObject({
      error: 'Los nuevos datos de contacto ya pertenecen a otro candidato registrado.',
      code: 'CANDIDATE_IDENTITY_CONFLICT'
    })
  })

  it('actualiza la identidad del candidato proxyando a Spring', async () => {
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', email: 'admin@example.com', role: 'ADMIN' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: VALID_UUID,
          applications: [
            { id: 'app-2', submittedAt: '2026-05-02T10:00:00.000Z', status: 'PENDING' },
            { id: 'app-1', submittedAt: '2026-05-01T10:00:00.000Z', status: 'REVIEWING' }
          ]
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
    expect(body.applications).toHaveLength(2)
    expect(fetchSpy).toHaveBeenCalledWith(
      `http://localhost:8080/api/v1/candidates/${VALID_UUID}`,
      expect.objectContaining({ method: 'PATCH' })
    )
  })
})
