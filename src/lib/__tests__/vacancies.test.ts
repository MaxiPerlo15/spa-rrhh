import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getVacancies,
  getVacancyById,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  toggleVacancyStatus,
  type Vacancy
} from '../api/vacancies'
import * as vacancyApi from '../api/vacancies'


describe('Vacancies API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getVacancies devuelve y normaliza vacantes', async () => {
    const mockData = [
      { id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'ACTIVE', createdAt: '' }
    ]
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ))

    const result = await getVacancies()
    expect(result[0].status).toBe('active') // Normalización
  })

  it('getVacancies lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(getVacancies()).rejects.toThrow('Error al obtener vacantes')
  })

  it('getVacancyById devuelve y normaliza una vacante', async () => {
    const mockVacancy = { id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'ACTIVE', createdAt: '' }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVacancy)
      })
    ))

    const result = await getVacancyById('1')
    expect(result.status).toBe('active')
  })

  it('createVacancy devuelve y normaliza la vacante creada', async () => {
    const mockVacancy = { id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'ACTIVE', createdAt: '' }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVacancy)
      })
    ))

    const result = await createVacancy({ title: 'Dev', description: '', location: '', workday: '', modality: '' })
    expect(result.status).toBe('active')
  })

  it('createVacancy lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Error custom' })
      })
    ))

    await expect(createVacancy({ title: 'Dev', description: '', location: '', workday: '', modality: '' }))
      .rejects.toThrow('Error custom')
  })

  it('updateVacancy devuelve y normaliza la vacante actualizada', async () => {
    const mockVacancy = { id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'CLOSED', createdAt: '' }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockVacancy)
      })
    ))

    const result = await updateVacancy('1', { status: 'CLOSED' })
    expect(result.status).toBe('closed')
  })

  it('deleteVacancy no lanza error si la respuesta es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true })
    ))

    await expect(deleteVacancy('1')).resolves.toBeUndefined()
  })

  it('deleteVacancy lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(deleteVacancy('1')).rejects.toThrow('Error al eliminar la vacante')
  })

  it('toggleVacancyStatus alterna el estado correctamente', async () => {
    // Mock updateVacancy para devolver el estado cambiado
    vi.spyOn(vacancyApi, 'updateVacancy').mockResolvedValueOnce({
      id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'closed', createdAt: ''
    })

    const vacancy: Vacancy = { id: '1', title: 'Dev', location: '', workday: '', modality: '', status: 'active', createdAt: '' }
    const result = await toggleVacancyStatus(vacancy)
    expect(result.status).toBe('closed')
  })
})