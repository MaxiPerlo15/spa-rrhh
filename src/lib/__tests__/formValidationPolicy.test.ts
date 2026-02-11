import { describe, it, expect, vi, afterEach } from 'vitest'
import { getEmailValidationMessage, validateInternationalPhone } from '../formValidationPolicy'

describe('formValidationPolicy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('acepta dominio permitido por allowlist', () => {
    vi.stubEnv('FORM_ALLOWED_EMAIL_DOMAINS', 'empresa.com, clientes.org')
    const result = getEmailValidationMessage('persona@empresa.com')
    expect(result).toBeUndefined()
  })

  it('rechaza dominio fuera de allowlist', () => {
    vi.stubEnv('FORM_ALLOWED_EMAIL_DOMAINS', 'empresa.com')
    const result = getEmailValidationMessage('persona@gmail.com')
    expect(result).toBe('El dominio del email no está permitido')
  })

  it('rechaza correos temporales por defecto', () => {
    const result = getEmailValidationMessage('persona@mailinator.com')
    expect(result).toBe('No se permiten correos temporales o descartables')
  })

  it('valida teléfono internacional con formato flexible', () => {
    const result = validateInternationalPhone('+54 11 1234-5678', { required: true })
    expect(result.isValid).toBe(true)
  })

  it('rechaza teléfono con caracteres no permitidos', () => {
    const result = validateInternationalPhone('abc-1234', { required: true })
    expect(result.isValid).toBe(false)
    expect(result.message).toBe('El teléfono solo puede contener números, espacios, +, paréntesis, puntos o guiones')
  })

  it('rechaza teléfono demasiado corto', () => {
    const result = validateInternationalPhone('+54 123', { required: true })
    expect(result.isValid).toBe(false)
    expect(result.message).toBe('El teléfono debe tener entre 8 y 15 dígitos')
  })
})
