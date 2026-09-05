import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const rejectIfUntrustedOriginMock = vi.fn()
const auditAdminActionMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: auditAdminActionMock
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

describe('/api/admin/candidates POST', () => {
  const payload = {
    candidateName: 'Ana Perez',
    email: 'ana@example.com',
    phone: '+54 9 11 1234-5678',
    notes: 'Referida por cliente.'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    rejectIfUntrustedOriginMock.mockReturnValue(null)
  })

  it('returns 503 without a configured Spring backend without local audit or upstream mutation', async () => {
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    vi.mocked(getBackendUrl).mockReturnValueOnce(null)
    const { POST } = await import('@/app/api/admin/candidates/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'Spring backend not configured' })
    expect(auditAdminActionMock).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rechaza candidatos manuales duplicados por identidad', async () => {
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', email: 'admin@example.com', role: 'ADMIN' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Ya existe un candidato registrado con estos datos de contacto.',
          code: 'DUPLICATE_CANDIDATE'
        }),
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
    expect(body).toMatchObject({
      error: 'Ya existe un candidato registrado con estos datos de contacto.',
      code: 'DUPLICATE_CANDIDATE'
    })
  })

  it('crea un candidato manual como postulación sin vacante asociada', async () => {
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', email: 'admin@example.com', role: 'ADMIN' }
    })
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidateId: 'cand_manual_1',
          personKey: 'abc123',
          applicationId: 'app_manual_1'
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
    expect(body).toMatchObject({
      candidateId: 'cand_manual_1',
      applicationId: 'app_manual_1'
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/candidates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          candidateName: 'Ana Perez',
          email: 'ana@example.com',
          phone: '+54 9 11 1234-5678',
          notes: 'Referida por cliente.'
        })
      })
    )
  })
})
