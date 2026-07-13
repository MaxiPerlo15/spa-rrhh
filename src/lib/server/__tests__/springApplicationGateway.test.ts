import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getApplication,
  updateApplicationStatus,
  deleteApplication,
  SpringApplicationDetailResponse,
  SpringApplicationWriteError
} from '../springApplicationGateway'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeSpringResponse(overrides: Partial<SpringApplicationDetailResponse> = {}): SpringApplicationDetailResponse {
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

describe('springApplicationGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('BACKEND_URL', 'http://localhost:8080')
    vi.stubEnv('BACKEND_INTERNAL_API_TOKEN', 'test-token')
  })

  describe('getApplication', () => {
    it('returns the application detail on success', async () => {
      const springData = makeSpringResponse()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => springData
      })

      const result = await getApplication('app-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/applications/app-1',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(springData)
    })

    it('returns null when Spring returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await getApplication('missing-id')

      expect(result).toBeNull()
    })

    it('throws on other Spring errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error'
      })

      await expect(getApplication('app-1')).rejects.toThrow('Spring backend rejected application lookup (500)')
    })
  })

  describe('updateApplicationStatus', () => {
    it('returns the updated application detail on success', async () => {
      const updated = makeSpringResponse({ status: 'REVIEWING' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updated
      })

      const result = await updateApplicationStatus('app-1', 'REVIEWING')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/applications/app-1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'REVIEWING' })
        })
      )
      expect(result.status).toBe('REVIEWING')
    })

    it('throws with status 400 on invalid transition', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Transición inválida' })
      })

      let error: SpringApplicationWriteError | undefined
      try {
        await updateApplicationStatus('app-1', 'ACCEPTED')
      } catch (e) {
        error = e as SpringApplicationWriteError
      }

      expect(error).toBeDefined()
      expect(error!.status).toBe(400)
    })

    it('throws with status 409 on same-state transition', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({ error: 'ya se encuentra en estado' })
      })

      let error: SpringApplicationWriteError | undefined
      try {
        await updateApplicationStatus('app-1', 'PENDING')
      } catch (e) {
        error = e as SpringApplicationWriteError
      }

      expect(error).toBeDefined()
      expect(error!.status).toBe(409)
    })

    it('throws on Spring 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      })

      let error: SpringApplicationWriteError | undefined
      try {
        await updateApplicationStatus('missing', 'REVIEWING')
      } catch (e) {
        error = e as SpringApplicationWriteError
      }

      expect(error).toBeDefined()
      expect(error!.status).toBe(404)
    })
  })

  describe('deleteApplication', () => {
    it('returns { success: true } on successful delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const result = await deleteApplication('app-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/applications/app-1',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result).toEqual({ success: true })
    })

    it('throws on Spring 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      })

      let error: SpringApplicationWriteError | undefined
      try {
        await deleteApplication('missing')
      } catch (e) {
        error = e as SpringApplicationWriteError
      }

      expect(error).toBeDefined()
      expect(error!.status).toBe(404)
    })

    it('throws on other Spring errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error'
      })

      await expect(deleteApplication('app-1')).rejects.toThrow()
    })
  })
})
