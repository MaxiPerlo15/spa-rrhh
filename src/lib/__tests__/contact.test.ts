import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getContacts,
  getContactById,
  createContact,
  updateContactStatus,
  deleteContact,
  type Contact,
  type CreateContactResponse
} from '../api/contacts'
import { isApiRequestError } from '../api/errors'

describe('Contacts API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getContacts devuelve contactos', async () => {
    const mockData: Contact[] = [
      { id: '1', name: 'Ana', email: 'ana@mail.com', phone: '123', subject: 'Hola', message: 'Mensaje', status: 'PENDING', createdAt: '' }
    ]
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData)
      })
    ))

    const result = await getContacts()
    expect(result).toEqual(mockData)
  })

  it('getContacts lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(getContacts()).rejects.toThrow('Error al obtener contactos')
  })

  it('getContactById devuelve un contacto', async () => {
    const mockContact: Contact = { id: '1', name: 'Ana', email: 'ana@mail.com', phone: '123', subject: 'Hola', message: 'Mensaje', status: 'PENDING', createdAt: '' }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockContact)
      })
    ))

    const result = await getContactById('1')
    expect(result).toEqual(mockContact)
  })

  it('createContact devuelve el payload real de confirmación', async () => {
    const mockResponse: CreateContactResponse = {
      message: 'Mensaje enviado exitosamente',
      contactId: '1'
    }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })
    ))

    const result = await createContact({
      name: 'Ana',
      email: 'ana@mail.com',
      phone: '123',
      subject: 'Hola',
      message: 'Mensaje'
    })
    expect(result).toEqual(mockResponse)
  })

  it('createContact lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Error custom' })
      })
    ))

    await expect(createContact({
      name: 'Ana',
      email: 'ana@mail.com',
      phone: '123',
      subject: 'Hola',
      message: 'Mensaje'
    })).rejects.toThrow('Error custom')
  })

  it('createContact prioriza el detalle de validación del backend', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          error: 'Datos inválidos',
          details: [{ field: 'email', message: 'El dominio del email no está permitido' }]
        })
      })
    ))

    await expect(createContact({
      name: 'Ana',
      email: 'ana@mail.com',
      phone: '123',
      subject: 'Hola',
      message: 'Mensaje'
    })).rejects.toThrow('El dominio del email no está permitido')
  })

  it('createContact preserva status y code en errores de API', async () => {
    try {
      vi.stubGlobal('fetch', vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({
            error: 'Mensaje duplicado',
            code: 'DUPLICATE_SUBMISSION'
          })
        })
      ))

      await createContact({
        name: 'Ana',
        email: 'ana@mail.com',
        phone: '123',
        subject: 'Hola',
        message: 'Mensaje'
      })
    } catch (error) {
      expect(isApiRequestError(error)).toBe(true)
      expect(error).toMatchObject({
        message: 'Mensaje duplicado',
        status: 409,
        code: 'DUPLICATE_SUBMISSION'
      })
      return
    }

    throw new Error('Expected createContact to throw')
  })

  it('updateContactStatus actualiza y devuelve el contacto', async () => {
    const mockContact: Contact = { id: '1', name: 'Ana', email: 'ana@mail.com', phone: '123', subject: 'Hola', message: 'Mensaje', status: 'RESPONDED', createdAt: '' }
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockContact)
      })
    ))

    const result = await updateContactStatus('1', 'RESPONDED')
    expect(result).toEqual(mockContact)
  })

  it('deleteContact no lanza error si la respuesta es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true })
    ))

    await expect(deleteContact('1')).resolves.toBeUndefined()
  })

  it('deleteContact lanza error si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false })
    ))

    await expect(deleteContact('1')).rejects.toThrow('Error al eliminar el contacto')
  })
})
