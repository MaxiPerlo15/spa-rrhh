// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  downloadApplicationsCsv,
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

  it('createApplication permite enviar postulación espontánea sin vacancyId', async () => {
    const mockApp: Application = {
      id: '2',
      candidateName: 'Ana',
      email: 'ana@a.com',
      phone: '123',
      status: 'PENDING',
      submittedAt: '',
      vacancy: undefined
    }
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApp)
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createApplication({
      candidateName: 'Ana',
      email: 'ana@a.com',
      phone: '123'
    })

    expect(result).toEqual(mockApp)
    expect(fetchMock).toHaveBeenCalledOnce()
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

  it('createApplication prioriza el detalle de validación del backend', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          error: 'Datos inválidos',
          details: [{ field: 'phone', message: 'El teléfono debe tener entre 8 y 15 dígitos' }]
        })
      })
    ))

    await expect(createApplication({
      vacancyId: 'v1',
      candidateName: 'Juan',
      email: 'a@a.com',
      phone: '123'
    })).rejects.toThrow('El teléfono debe tener entre 8 y 15 dígitos')
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

  it('downloadApplicationsCsv descarga archivo con los filtros actuales', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const clickMock = vi.fn()
    const realAnchor = document.createElement('a')
    vi.spyOn(realAnchor, 'click').mockImplementation(clickMock)
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return realAnchor
      return originalCreateElement(tagName)
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['test']))
        })
      )
    )

    await downloadApplicationsCsv({
      search: 'ana',
      status: 'PENDING',
      vacancyId: 'cmc7q8v1r0000v5r4f9k0m2n3',
      sortBy: 'submittedAt',
      sortDirection: 'desc'
    })

    expect(clickMock).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
    appendChildSpy.mockRestore()
  })
})
