import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/lib/csrf', () => ({
  rejectIfUntrustedOrigin: vi.fn().mockReturnValue(null)
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/lib/server/applicationVacancyMetadata', () => ({
  getApplicationVacancyMetadata: vi.fn().mockResolvedValue(null)
}))

vi.mock('@/lib/candidateRecord', () => ({
  resolveApplicationCandidate: vi.fn((data: unknown) => data)
}))

vi.mock('@/domain/application/ApplicationStatusMachine', () => ({
  ApplicationStatusMachine: { assertTransition: vi.fn() }
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({ 'X-Backend-Api-Key': 'test-token' }))
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

vi.mock('@/lib/apiValidation', () => ({
  routeIdSchema: { safeParse: (data: { id: string }) => ({ success: true, data }) },
  formatValidationError: (error: unknown) => ({ error: String(error) }),
  updateApplicationStatusSchema: {
    safeParse: (data: unknown) => {
      const body = data as { status?: string }
      if (!body?.status) return { success: false, error: 'status is required' }
      return { success: true, data: { status: body.status } }
    }
  }
}))

vi.mock('@/lib/dto/application', () => ({
  toApplicationAdminDto: (data: unknown) => data
}))

const { auth } = await import('@/lib/auth')
const { auditAdminAction } = await import('@/lib/adminAudit')
const { rejectIfUntrustedOrigin } = await import('@/lib/csrf')
const { getApplication, updateApplicationStatus, deleteApplication, SpringApplicationWriteError } = await import('@/lib/server/springApplicationGateway')

import { GET, PATCH, DELETE } from '@/app/api/applications/[id]/route'
import type { SpringApplicationDetailResponse } from '@/lib/server/springApplicationGateway'

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
    headers: { origin: 'http://localhost:3000' },
    body: body ? JSON.stringify(body) : undefined
  })
}

describe('[id]/route — Spring-delegated handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' } } as never)
  })

  describe('GET', () => {
    it('returns 401 when session is missing', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)
      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(401)
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'DENIED' })
      )
    })

    it('returns 401 when session is not ADMIN', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { role: 'USER' } } as never)
      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(401)
    })

    it('returns 200 with application data on success', async () => {
      const springData = makeSpringApp()
      vi.mocked(getApplication).mockResolvedValueOnce(springData)

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(200)
      expect(getApplication).toHaveBeenCalledWith('app-1')
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'SUCCESS', resourceType: 'application', resourceId: 'app-1' })
      )
      const body = await response.json()
      expect(body.id).toBe('app-1')
    })

    it('returns 404 when application not found', async () => {
      vi.mocked(getApplication).mockResolvedValueOnce(null)

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'missing' }) })

      expect(response.status).toBe(404)
    })

    it('returns 500 on Spring gateway error', async () => {
      vi.mocked(getApplication).mockRejectedValueOnce(new Error('Spring backend rejected'))

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(500)
    })

    it('returns 403 when origin is untrusted', async () => {
      vi.mocked(rejectIfUntrustedOrigin).mockReturnValueOnce(
        new NextResponse(null, { status: 403 })
      )

      const response = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(403)
      expect(getApplication).not.toHaveBeenCalled()
    })
  })

  describe('PATCH', () => {
    it('returns 401 when session is missing', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)
      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(401)
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'DENIED', action: 'application.update_status' })
      )
    })

    it('returns 200 with updated application on valid transition', async () => {
      const updated = makeSpringApp({ status: 'REVIEWING' })
      vi.mocked(updateApplicationStatus).mockResolvedValueOnce(updated)

      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(200)
      expect(updateApplicationStatus).toHaveBeenCalledWith('app-1', 'REVIEWING')
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'SUCCESS', action: 'application.update_status' })
      )
      const body = await response.json()
      expect(body.status).toBe('REVIEWING')
    })

    it('returns 400 on invalid transition (Spring 400)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(400, 'Transición inválida')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'ACCEPTED' }), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Transición inválida')
    })

    it('returns 409 on same-state (Spring 409)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(409, 'ya se encuentra en estado')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'PENDING' }), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(409)
    })

    it('returns 404 when application missing (Spring 404)', async () => {
      vi.mocked(updateApplicationStatus).mockRejectedValueOnce(
        new SpringApplicationWriteError(404, 'Postulación no encontrada')
      )

      const response = await PATCH(makeRequest('PATCH', { status: 'REVIEWING' }), { params: Promise.resolve({ id: 'missing' }) })

      expect(response.status).toBe(404)
    })

    it('returns 400 on invalid body', async () => {
      const response = await PATCH(makeRequest('PATCH', {}), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(400)
      expect(updateApplicationStatus).not.toHaveBeenCalled()
    })
  })

  describe('DELETE', () => {
    it('returns 401 when session is missing', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null)
      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(401)
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'DENIED', action: 'application.delete' })
      )
    })

    it('returns 200 with { success: true } on success', async () => {
      vi.mocked(deleteApplication).mockResolvedValueOnce({ success: true })

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(200)
      expect(deleteApplication).toHaveBeenCalledWith('app-1')
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'SUCCESS', action: 'application.delete', resourceId: 'app-1' })
      )
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('returns 404 when application not found', async () => {
      vi.mocked(deleteApplication).mockRejectedValueOnce(
        new SpringApplicationWriteError(404, 'Postulación no encontrada')
      )

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'missing' }) })

      expect(response.status).toBe(404)
    })

    it('returns 500 on Spring gateway error', async () => {
      vi.mocked(deleteApplication).mockRejectedValueOnce(new Error('Spring backend rejected'))

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(500)
      expect(auditAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'ERROR', action: 'application.delete' })
      )
    })

    it('returns 403 when origin is untrusted', async () => {
      vi.mocked(rejectIfUntrustedOrigin).mockReturnValueOnce(
        new NextResponse(null, { status: 403 })
      )

      const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ id: 'app-1' }) })

      expect(response.status).toBe(403)
      expect(deleteApplication).not.toHaveBeenCalled()
    })
  })
})
