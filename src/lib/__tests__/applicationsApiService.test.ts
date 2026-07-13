import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ApiRequestError } from '@/lib/api/errors'

const apiFetchMock = vi.fn()

vi.mock('@/lib/api/http', () => ({
  apiFetch: apiFetchMock
}))

describe('applications API service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getApiErrorPayload (via createApplication)', () => {
    it('extracts error message from JSON response details', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'email', message: 'Invalid email format' }]
        })
      })

      const { createApplication } = await import('@/lib/api/applications')
      await expect(
        createApplication({
          candidateName: 'Test',
          email: 'bad',
          phone: '+54 9 11 1234-5678'
        })
      ).rejects.toThrow('Invalid email format')
    })

    it('falls back to error.error when details have no message', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Bad request',
          details: [{ field: 'name' }]
        })
      })

      const { createApplication } = await import('@/lib/api/applications')
      await expect(
        createApplication({
          candidateName: 'Test',
          email: 'test@example.com',
          phone: '+54 9 11 1234-5678'
        })
      ).rejects.toThrow('Bad request')
    })

    it('uses fallback message when JSON parse fails', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON') }
      })

      const { createApplication } = await import('@/lib/api/applications')
      await expect(
        createApplication({
          candidateName: 'Test',
          email: 'test@example.com',
          phone: '+54 9 11 1234-5678'
        })
      ).rejects.toThrow('Error al crear la postulación')
    })

    it('includes status and code in ApiRequestError', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Duplicate',
          code: 'DUPLICATE_SUBMISSION'
        })
      })

      const { createApplication } = await import('@/lib/api/applications')
      try {
        await createApplication({
          candidateName: 'Test',
          email: 'test@example.com',
          phone: '+54 9 11 1234-5678'
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError)
        expect((error as ApiRequestError).status).toBe(409)
        expect((error as ApiRequestError).code).toBe('DUPLICATE_SUBMISSION')
      }
    })
  })

  describe('getApplications', () => {
    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const { getApplications } = await import('@/lib/api/applications')
      await expect(getApplications()).rejects.toThrow('Error al obtener postulaciones')
    })

    it('returns applications on success', async () => {
      const apps = [{ id: '1', candidateName: 'Ana' }]
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => apps
      })

      const { getApplications } = await import('@/lib/api/applications')
      const result = await getApplications()
      expect(result).toEqual(apps)
    })
  })

  describe('getApplicationById', () => {
    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const { getApplicationById } = await import('@/lib/api/applications')
      await expect(getApplicationById('123')).rejects.toThrow('Error al obtener la postulación')
    })
  })

  describe('updateApplicationStatus', () => {
    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const { updateApplicationStatus } = await import('@/lib/api/applications')
      await expect(
        updateApplicationStatus('123', 'ACCEPTED')
      ).rejects.toThrow('Error al actualizar el estado de la postulación')
    })

    it('returns updated application on success', async () => {
      const app = { id: '123', status: 'ACCEPTED' }
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => app
      })

      const { updateApplicationStatus } = await import('@/lib/api/applications')
      const result = await updateApplicationStatus('123', 'ACCEPTED')
      expect(result).toEqual(app)
    })
  })

  describe('deleteApplication', () => {
    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403
      })

      const { deleteApplication } = await import('@/lib/api/applications')
      await expect(deleteApplication('123')).rejects.toThrow('Error al eliminar la postulación')
    })
  })

  describe('createAdminCandidate', () => {
    it('throws ApiRequestError with fallback message when JSON parse fails', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON') }
      })

      const { createAdminCandidate } = await import('@/lib/api/applications')
      await expect(
        createAdminCandidate({ candidateName: 'Test', email: 't@e.com', phone: '+54 9 11 1234-5678' })
      ).rejects.toThrow('Error al registrar el candidato')
    })
  })

  describe('updateAdminCandidate', () => {
    it('throws ApiRequestError with fallback message when JSON parse fails', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON') }
      })

      const { updateAdminCandidate } = await import('@/lib/api/applications')
      await expect(
        updateAdminCandidate('123', { candidateName: 'Test', email: 't@e.com', phone: '+54 9 11 1234-5678' })
      ).rejects.toThrow('Error al actualizar el candidato')
    })
  })
})
