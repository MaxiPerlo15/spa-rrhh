// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  downloadApplicationsCsv,
  downloadCandidatesCsv,
  type Application,
  type CreateApplicationResponse
} from '../api/applications'
import { isApiRequestError } from '../api/errors'

describe('Applications API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getApplications devuelve el array de postulaciones', async () => {
    const mockData: Application[] = [
      { id: '1', candidateId: 'c1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'PENDING', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
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
    const mockApp: Application = { id: '1', candidateId: 'c1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'PENDING', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApp)
      })
    ))

    const result = await getApplicationById('1')
    expect(result).toEqual(mockApp)
  })

  it('createApplication devuelve el payload real de confirmación', async () => {
    const mockResponse: CreateApplicationResponse = {
      message: 'Postulación enviada exitosamente',
      applicationId: '1'
    }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    ))

    const result = await createApplication({
      vacancyId: 'v1',
      candidateName: 'Juan',
      email: 'a@a.com',
      phone: '123'
    })
    expect(result).toEqual(mockResponse)
  })

  it('createApplication permite enviar postulación espontánea sin vacancyId', async () => {
    const mockResponse: CreateApplicationResponse = {
      message: 'Postulación enviada exitosamente',
      applicationId: '2'
    }
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await createApplication({
      candidateName: 'Ana',
      email: 'ana@a.com',
      phone: '123'
    })

    expect(result).toEqual(mockResponse)
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

  it('createApplication preserva status y code en errores de API', async () => {
    try {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({
            error: 'Ya existe una postulación',
            code: 'DUPLICATE_SUBMISSION'
          })
        })
      ))

      await createApplication({
        vacancyId: 'v1',
        candidateName: 'Juan',
        email: 'a@a.com',
        phone: '123'
      })
    } catch (error) {
      expect(isApiRequestError(error)).toBe(true)
      expect(error).toMatchObject({
        message: 'Ya existe una postulación',
        status: 409,
        code: 'DUPLICATE_SUBMISSION'
      })
      return
    }

    throw new Error('Expected createApplication to throw')
  })

  it('updateApplicationStatus actualiza y devuelve la postulación', async () => {
    const mockApp: Application = { id: '1', candidateId: 'c1', candidateName: 'Juan', email: 'a@a.com', phone: '123', status: 'ACCEPTED', submittedAt: '', vacancy: { id: 'v1', title: 'Dev' } }
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

  it('downloadCandidatesCsv descarga archivo con la búsqueda actual', async () => {
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

    await downloadCandidatesCsv({
      search: 'ana'
    })

    expect(clickMock).toHaveBeenCalled()
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
    appendChildSpy.mockRestore()
  })
})
