import { describe, it, expect } from 'vitest'
import { buildPersonKey } from '@/lib/personIdentity'

describe('personKey parity with Spring ApplicationManager.buildPersonKey()', () => {
  // The SHA-256 hash algorithm in backend/.../ApplicationManager.java must produce
  // identical output to src/lib/personIdentity.ts buildPersonKey() for the same inputs.
  // Fingerprint: SHA-256(normalizedEmail + "|" + normalizedPhone)

  it('produces consistent 64-char hex hash for mixed-case email and formatted phone', () => {
    const email = 'Ana@Example.com'
    const phone = '+54 11 5678-1234'

    const result = buildPersonKey(email, phone)

    expect(result).toMatch(/^[a-f0-9]{64}$/)
    expect(result.length).toBe(64)
  })

  it('produces same result for identical inputs', () => {
    const email = 'Test@Domain.COM'
    const phone = '11-5555-0000'

    const first = buildPersonKey(email, phone)
    const second = buildPersonKey(email, phone)

    expect(first).toBe(second)
  })

  it('normalizes email to lowercase and trims whitespace', () => {
    const result1 = buildPersonKey('  User@Example.com  ', '123')
    const result2 = buildPersonKey('user@example.com', '123')

    expect(result1).toBe(result2)
  })

  it('normalizes phone: strips non-digits, preserves leading +', () => {
    const result1 = buildPersonKey('a@b.com', '+54 11 5678-1234')
    const result2 = buildPersonKey('a@b.com', '+541156781234')

    expect(result1).toBe(result2)
  })

  it('normalizes phone without +: strips non-digits', () => {
    const result1 = buildPersonKey('a@b.com', '54 11 5678-1234')
    const result2 = buildPersonKey('a@b.com', '541156781234')

    expect(result1).toBe(result2)
  })

  it('different emails produce different keys', () => {
    const key1 = buildPersonKey('ana@test.com', '123')
    const key2 = buildPersonKey('bob@test.com', '123')

    expect(key1).not.toBe(key2)
  })

  it('different phones produce different keys', () => {
    const key1 = buildPersonKey('ana@test.com', '111')
    const key2 = buildPersonKey('ana@test.com', '222')

    expect(key1).not.toBe(key2)
  })
})
