import { describe, expect, it, vi, beforeEach } from 'vitest'

const apiFetchMock = vi.fn()

vi.mock('@/lib/api/http', () => ({
  apiFetch: apiFetchMock
}))

describe('vacancies API service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getVacancies', () => {
    it('includes ?all=1 query when includeAll is true', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', status: 'ACTIVE', title: 'Test', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01' }]
      })

      const { getVacancies } = await import('@/lib/api/vacancies')
      await getVacancies({ includeAll: true })

      expect(apiFetchMock).toHaveBeenCalledWith('/api/vacancies?all=1')
    })

    it('does not include query when includeAll is false', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const { getVacancies } = await import('@/lib/api/vacancies')
      await getVacancies()

      expect(apiFetchMock).toHaveBeenCalledWith('/api/vacancies')
    })

    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

      const { getVacancies } = await import('@/lib/api/vacancies')
      await expect(getVacancies()).rejects.toThrow('Error al obtener vacantes')
    })

    it('normalizes vacancy status to lowercase', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', status: 'ACTIVE', title: 'T', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01' }]
      })

      const { getVacancies } = await import('@/lib/api/vacancies')
      const result = await getVacancies()
      expect(result[0].status).toBe('active')
    })
  })

  describe('getVacancyById', () => {
    it('throws on non-ok response', async () => {
      apiFetchMock.mockResolvedValueOnce({ ok: false, status: 404 })

      const { getVacancyById } = await import('@/lib/api/vacancies')
      await expect(getVacancyById('123')).rejects.toThrow('Error al obtener la vacante')
    })
  })

  describe('createVacancy', () => {
    it('throws with error message from response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Title already exists' })
      })

      const { createVacancy } = await import('@/lib/api/vacancies')
      await expect(
        createVacancy({ title: 'T', description: 'D', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE' })
      ).rejects.toThrow('Title already exists')
    })

    it('throws fallback message when response has no error field', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      })

      const { createVacancy } = await import('@/lib/api/vacancies')
      await expect(
        createVacancy({ title: 'T', description: 'D', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE' })
      ).rejects.toThrow('Error al crear la vacante')
    })
  })

  describe('updateVacancy', () => {
    it('throws with error message from response', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Cannot update closed vacancy' })
      })

      const { updateVacancy } = await import('@/lib/api/vacancies')
      await expect(
        updateVacancy('123', { title: 'New' })
      ).rejects.toThrow('Cannot update closed vacancy')
    })

    it('throws fallback message when response has no error field', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      })

      const { updateVacancy } = await import('@/lib/api/vacancies')
      await expect(
        updateVacancy('123', { title: 'New' })
      ).rejects.toThrow('Error al actualizar la vacante')
    })
  })

  describe('deleteVacancy', () => {
    it('throws with error from readApiError', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      })

      const { deleteVacancy } = await import('@/lib/api/vacancies')
      await expect(deleteVacancy('123')).rejects.toThrow('Forbidden')
    })

    it('throws fallback when JSON parse fails', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Not JSON') }
      })

      const { deleteVacancy } = await import('@/lib/api/vacancies')
      await expect(deleteVacancy('123')).rejects.toThrow('Error al cerrar la vacante')
    })
  })

  describe('toggleVacancyStatus', () => {
    it('deactivates active vacancy', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', status: 'INACTIVE', title: 'T', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01' })
      })

      const { toggleVacancyStatus } = await import('@/lib/api/vacancies')
      const result = await toggleVacancyStatus({
        id: '1', status: 'active', title: 'T', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01'
      })
      expect(result.status).toBe('inactive')
    })

    it('activates inactive vacancy', async () => {
      apiFetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', status: 'ACTIVE', title: 'T', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01' })
      })

      const { toggleVacancyStatus } = await import('@/lib/api/vacancies')
      const result = await toggleVacancyStatus({
        id: '1', status: 'inactive', title: 'T', location: 'L', workday: 'FULL_TIME', modality: 'ON_SITE', createdAt: '2026-01-01'
      })
      expect(result.status).toBe('active')
    })
  })
})
