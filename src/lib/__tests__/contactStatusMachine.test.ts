import { describe, expect, it } from 'vitest'
import { ContactStatusMachine } from '@/domain/contact/ContactStatusMachine'

describe('ContactStatusMachine', () => {
  it('permite responder y archivar contactos según el flujo operativo', () => {
    expect(ContactStatusMachine.respond('PENDING')).toBe('RESPONDED')
    expect(ContactStatusMachine.archive('PENDING')).toBe('ARCHIVED')
    expect(ContactStatusMachine.archive('RESPONDED')).toBe('ARCHIVED')
  })

  it('rechaza transiciones inválidas', () => {
    expect(() => ContactStatusMachine.respond('ARCHIVED')).toThrow(
      'Transición inválida de contacto: ARCHIVED -> RESPONDED'
    )
    expect(() => ContactStatusMachine.archive('ARCHIVED')).toThrow(
      'El contacto ya se encuentra en estado ARCHIVED'
    )
  })
})
