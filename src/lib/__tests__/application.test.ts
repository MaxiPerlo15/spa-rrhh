import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  type Application
} from '../api/applications'

describe('Applications API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getApplications devuelve el array de postulaciones', async () => {
    const mockData: Application[] = [
      { id: '1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'PENDING', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
    ]
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ))

    const result = await getApplications()
    expect(result).toEqual(mockData)
  })

  it('getApplications lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(getApplications()).rejects.toThrow('Error al obtener postulaciones')
  })

  it('getApplicationById devuelve una postulación', async () => {
    const mockApp: Application = { id: '1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'PENDING', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApp)
      })
    ))

    const result = await getApplicationById('1')
    expect(result).toEqual(mockApp)
  })

  it('createApplication devuelve la postulación creada', async () => {
    const mockApp: Application = { id: '1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'PENDING', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApp)
      })
    ))

    const result = await createApplication({
      vacancyId: 'v1',
      candidateName: 'Juan',
      email: 'a@a.com',
      phone: '123'
    })
    expect(result).toEqual(mockApp)
  })

  it('createApplication lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Error custom' })
      })
    ))

    await expect(createApplication({
      vacancyId: 'v1',
      candidateName: 'Juan',
      email: 'a@a.com',
      phone: '123'
    })).rejects.toThrow('Error custom')
  })

  it('updateApplicationStatus actualiza y devuelve la postulación', async () => {
    const mockApp: Application = { id: '1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'ACCEPTED', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApp)
      })
    ))

    const result = await updateApplicationStatus('1', 'ACCEPTED')
    expect(result).toEqual(mockApp)
  })

  it('deleteApplication no lanza error si la respuesta es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true })
    ))

    await expect(deleteApplication('1')).resolves.toBeUndefined()
  })

  it('deleteApplication lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(deleteApplication('1')).rejects.toThrow('Error al eliminar la postulación')
  })
})