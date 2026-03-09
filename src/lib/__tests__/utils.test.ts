import { describe, it, expect } from 'vitest'
import { normalizeLocation, isValidEmail, isNotEmpty } from '../utils'

describe('normalizeLocation', () => {
  it('elimina espacios al inicio y final', () => {
    expect(normalizeLocation('  Las Varillas  ')).toBe('Las Varillas')
  })

  it('reemplaza múltiples espacios por uno solo', () => {
    expect(normalizeLocation('Las    Varillas   Córdoba')).toBe('Las Varillas Córdoba')
  })

  it('normaliza espacios alrededor de comas', () => {
    expect(normalizeLocation('Las Varillas ,Córdoba')).toBe('Las Varillas, Córdoba')
    expect(normalizeLocation('Las Varillas,   Córdoba')).toBe('Las Varillas, Córdoba')
    expect(normalizeLocation('  Las   Varillas  ,   Córdoba  ')).toBe('Las Varillas, Córdoba')
  })

  it('funciona con una sola palabra', () => {
    expect(normalizeLocation('Córdoba')).toBe('Córdoba')
  })
})

describe('isValidEmail', () => {
  it('valida emails correctos', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('juan.perez@empresa.com')).toBe(true)
  })

  it('rechaza emails incorrectos', () => {
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('test.com')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isNotEmpty', () => {
  it('devuelve true para strings no vacíos', () => {
    expect(isNotEmpty('hola')).toBe(true)
    expect(isNotEmpty('  hola  ')).toBe(true)
  })

  it('devuelve false para strings vacíos o solo espacios', () => {
    expect(isNotEmpty('')).toBe(false)
    expect(isNotEmpty('   ')).toBe(false)
    expect(isNotEmpty(null)).toBe(false)
    expect(isNotEmpty(undefined)).toBe(false)
  })
})

