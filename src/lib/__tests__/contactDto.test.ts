import { describe, it, expect } from 'vitest'
import { toContactAdminDto, ContactAdminDto } from '../dto/contact'

describe('toContactAdminDto', () => {
  it('maps a plain contact object to ContactAdminDto with Date createdAt', () => {
    const input = {
      id: 'c1',
      name: 'Ana Garcia',
      email: 'ana@example.com',
      phone: '+54 11 5678-1234',
      subject: 'Consulta',
      message: 'Hola',
      status: 'PENDING' as const,
      createdAt: new Date('2026-01-15T10:30:00.000Z')
    }

    const result = toContactAdminDto(input)

    expect(result.id).toBe('c1')
    expect(result.name).toBe('Ana Garcia')
    expect(result.email).toBe('ana@example.com')
    expect(result.phone).toBe('+54 11 5678-1234')
    expect(result.subject).toBe('Consulta')
    expect(result.message).toBe('Hola')
    expect(result.status).toBe('PENDING')
    expect(result.createdAt).toBe('2026-01-15T10:30:00.000Z')
  })

  it('maps a plain contact object with string createdAt', () => {
    const input = {
      id: 'c2',
      name: 'Bob Smith',
      email: 'bob@test.com',
      phone: '555-1234',
      subject: 'Trabajo',
      message: 'Interesado',
      status: 'RESPONDED' as const,
      createdAt: '2026-03-20T14:00:00.000Z'
    }

    const result = toContactAdminDto(input)

    expect(result.status).toBe('RESPONDED')
    expect(result.createdAt).toBe('2026-03-20T14:00:00.000Z')
  })

  it('returns correct ContactAdminDto type shape', () => {
    const input = {
      id: 'c3',
      name: 'Test',
      email: 'test@test.com',
      phone: '123',
      subject: 'Subj',
      message: 'Msg',
      status: 'ARCHIVED' as const,
      createdAt: new Date('2026-04-10T12:00:00.000Z')
    }

    const result: ContactAdminDto = toContactAdminDto(input)

    expect(result.id).toBe('c3')
    expect(result.name).toBe('Test')
    expect(result.email).toBe('test@test.com')
    expect(result.phone).toBe('123')
    expect(result.subject).toBe('Subj')
    expect(result.message).toBe('Msg')
    expect(result.status).toBe('ARCHIVED')
    expect(result.createdAt).toBe('2026-04-10T12:00:00.000Z')
  })
})
