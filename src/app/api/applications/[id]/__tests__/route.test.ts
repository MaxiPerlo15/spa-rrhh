import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/springSession', () => ({
  getSpringSession: vi.fn()
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn().mockReturnValue(null)
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080')
}))

vi.mock('@/lib/server/springApplicationGateway', () => ({
  getApplication: vi.fn(),
  updateApplicationStatus: vi.fn(),
  deleteApplication: vi.fn(),
  SpringApplicationWriteError: class SpringApplicationWriteError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'SpringApplicationWriteError'
      this.status = status
    }
  }
}))

vi.mock('@/lib/dto/application', () => ({
  toApplicationAdminDto: (data: unknown) => data
}))

const { rejectIfUntrustedOrigin } = await import('@/lib/csrf')
const { getSpringSession } = await import('@/lib/springSession')
const { getBackendUrl } = await import('@/lib/server/springBackend')
const { getApplication, updateApplicationStatus, deleteApplication, SpringApplicationWriteError } = await import('@/lib/server/springApplicationGateway')

import { GET, PATCH, DELETE } from '@/app/api/applications/[id]/route'
import type { SpringApplicationDetailResponse } from '@/lib/server/springApplicationGateway'

const applicationId = '8d5b6e0d-8262-4e80-8aaa-0a0e0a0e0a0e'

function expectRotatedCookie(response: NextResponse) {
  expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated-session')
}

function makeSpringApp(overrides: Partial<SpringApplicationDetailResponse> = {}): SpringApplicationDetailResponse {
  return {
    id: 'app-1',
    candidateId: 'cand-1',
    candidateName: 'Juan Pérez',
    email: 'juan@test.com',
    phone: '+5491112345678',
    resumeUrl: null,
    resumeFileName: null,
    coverLetter: null,
    status: 'PENDING',
    submittedAt: '2026-07-08T10:00:00Z',
    vacancy: null,
    ...overrides
  }
}

function makeRequest(method: 'GET' | 'PATCH' | 'DELETE', body?: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/applications/app-1', {
    method,
    headers: { origin: 'http://localhost:3000', Cookie: 'SESSIONID=spring-admin-session' },
    body: body ? JSON.stringify(body) : undefined
  })
}

function makeMalformedPatchRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/applications/app-1', {
    method: 'PATCH',
    headers: {
      origin: 'http://localhost:3000',
      Cookie: 'SESSIONID=spring-admin-session',
      'Content-Type': 'application/json'
    },
    body: '{'
  })
}

describe('[id]/route — Spring-delegated handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSpringSession).mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: {
        userId: 'spring-admin',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'role-admin', nombre: 'ADMIN', permisos: ['admin:access'] }
      }
    })
  })

  describe('GET', () => {
    it('returns 401 when the Spring session is missing', async () => {
      vi.mocked(getSpringSession).mockResolvedValueOnce({ state: 'anonymous', setCookie: 'SESSIONID=; Max-Age=0; Path=/; HttpOnly' })
      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(401)
      expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
      expect(getApplication).not.toHaveBeenCalled()
    })

    it('returns 403 when the Spring session lacks admin access', async () => {
      vi.mocked(getSpringSession).mockResolvedValueOnce({ state: 'forbidden' })
      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(403)
    })

    it('returns 200 with application data on success', async () => {
      const springData = makeSpringApp()
      vi.mocked(getApplication).mockResolvedValueOnce(springData)

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(200)
      expect(getSpringSession).toHaveBeenCalledWith('SESSIONID=spring-admin-session')
      expect(getApplication).toHaveBeenCalledWith(applicationId, 'SESSIONID=rotated-session')
      expectRotatedCookie(response)
      const body = await response.json()
      expect(body.id).toBe('app-1')
    })

    it('returns 404 when application not found', async () => {
      vi.mocked(getApplication).mockResolvedValueOnce(null)

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(404)
      expectRotatedCookie(response)
    })

    it('returns 500 on Spring gateway error', async () => {
      vi.mocked(getApplication).mockRejectedValueOnce(new Error('Spring backend rejected'))

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(500)
      expectRotatedCookie(response)
    })

    it('returns 403 when origin is untrusted', async () => {
      vi.mocked(rejectIfUntrustedOrigin).mockReturnValueOnce(
        new NextResponse(null, { status: 403 })
      )

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(403)
      expectRotatedCookie(response)
      expect(getApplication).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the route id is malformed', async () => {
      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'invalid-id' }) })

      expect(response.status).toBe(400)
      expectRotatedCookie(response)
      expect(getApplication).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the backend is unconfigured', async () => {
      vi.mocked(getBackendUrl).mockReturnValueOnce(null)

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(503)
      expectRotatedCookie(response)
      expect(getApplication).not.toHaveBeenCalled()
    })
  })

  describe('PATCH', () => {
    it('returns 401 when the Spring session is missing', async () => {
      vi.mocked(getSpringSession).mockResolvedValueOnce({ state: 'anonymous' })
      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(401)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })

    it('returns 200 with updated application on valid transition', async () => {
      const updated = makeSpringApp({ status: 'REVIEWING' })
      vi.mocked(updateApplicationStatus).mockResolvedValueOnce(updated)

      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(200)
      expect(updateApplicationStatus).toHaveBeenCalledWith(applicationId, 'REVIEWING', 'SESSIONID=rotated-session')
      expectRotatedCookie(response)
      const body = await response.json()
      expect(body.status).toBe('REVIEWING')
    })

    it('returns 400 on invalid transition (Spring 400)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(400, 'Transición inválida')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'ACCEPTED' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(400)
      expectRotatedCookie(response)
      const body = await response.json()
      expect(body.error).toContain('Transición inválida')
    })

    it('returns 409 on same-state (Spring 409)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(409, 'ya se encuentra en estado')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'PENDING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(409)
      expectRotatedCookie(response)
    })

    it('returns 404 when application missing (Spring 404)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(404, 'Postulación no encontrada')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(404)
      expectRotatedCookie(response)
    })

    it('returns 400 on invalid body', async () => {
      const response = await PATCH(makeRequest('PATCH', {}), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(400)
      expectRotatedCookie(response)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })

    it('returns 500 and relays the rotated cookie when authorized PATCH JSON is malformed', async () => {
      const response = await PATCH(makeMalformedPatchRequest(), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(500)
      expectRotatedCookie(response)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the route id is malformed', async () => {
      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: 'invalid-id' }) })

      expect(response.status).toBe(400)
      expectRotatedCookie(response)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the backend is unconfigured', async () => {
      vi.mocked(getBackendUrl).mockReturnValueOnce(null)

      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(503)
      expectRotatedCookie(response)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie on CSRF and unexpected errors', async () => {
      vi.mocked(rejectIfUntrustedOrigin).mockReturnValueOnce(new NextResponse(null, { status: 403 }))
      const csrfResponse = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(new Error('Spring backend rejected'))
      const errorResponse = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: applicationId }) })

      expect(csrfResponse.status).toBe(403)
      expectRotatedCookie(csrfResponse)
      expect(errorResponse.status).toBe(500)
      expectRotatedCookie(errorResponse)
    })
  })

  describe('DELETE', () => {
    it('returns 401 when the Spring session is missing', async () => {
      vi.mocked(getSpringSession).mockResolvedValueOnce({ state: 'anonymous' })
      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(401)
      expect(deleteApplication).not.toHaveBeenCalled()
    })

    it('returns 200 with { success: true } on success', async () => {
      vi.mocked(deleteApplication).mockResolvedValueOnce({ success: true })

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(200)
      expect(deleteApplication).toHaveBeenCalledWith(applicationId, 'SESSIONID=rotated-session')
      expectRotatedCookie(response)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('returns 404 when application not found', async () => {
      vi.mocked(deleteApplication).mockRejectedValueOnce(
        new SpringApplicationWriteError(404, 'Postulación no encontrada')
      )

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(404)
      expectRotatedCookie(response)
    })

    it('relays the rotated cookie on a Spring write error', async () => {
      vi.mocked(deleteApplication).mockRejectedValueOnce(
        new SpringApplicationWriteError(409, 'Postulación no se puede eliminar')
      )

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(409)
      expectRotatedCookie(response)
    })

    it('returns 500 on Spring gateway error', async () => {
      vi.mocked(deleteApplication).mockRejectedValueOnce(new Error('Spring backend rejected'))

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(500)
      expectRotatedCookie(response)
    })

    it('returns 403 when origin is untrusted', async () => {
      vi.mocked(rejectIfUntrustedOrigin).mockReturnValueOnce(
        new NextResponse(null, { status: 403 })
      )

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(403)
      expectRotatedCookie(response)
      expect(deleteApplication).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the route id is malformed', async () => {
      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'invalid-id' }) })

      expect(response.status).toBe(400)
      expectRotatedCookie(response)
      expect(deleteApplication).not.toHaveBeenCalled()
    })

    it('relays the rotated cookie when the backend is unconfigured', async () => {
      vi.mocked(getBackendUrl).mockReturnValueOnce(null)

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: applicationId }) })

      expect(response.status).toBe(503)
      expectRotatedCookie(response)
      expect(deleteApplication).not.toHaveBeenCalled()
    })
  })
})
