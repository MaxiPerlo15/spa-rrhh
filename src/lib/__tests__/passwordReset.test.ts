import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  buildPasswordResetLink,
  generateRawResetToken,
  getPasswordResetTokenTtlMinutes,
  hashResetToken,
  validateNewPassword
} from '../passwordReset'

describe('passwordReset helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('genera tokens aleatorios válidos', () => {
    const tokenA = generateRawResetToken()
    const tokenB = generateRawResetToken()

    expect(tokenA).not.toEqual(tokenB)
    expect(tokenA.length).toBeGreaterThan(30)
  })

  it('hashea token de forma determinística', () => {
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
    const token = 'abc'
    expect(hashResetToken(token)).toEqual(hashResetToken(token))
  })

  it('usa TTL configurado por env', () => {
    vi.stubEnv('PASSWORD_RESET_TOKEN_TTL_MINUTES', '45')
    expect(getPasswordResetTokenTtlMinutes()).toBe(45)
  })

  it('arma link de reset con NEXTAUTH_URL', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://example.com')
    const link = buildPasswordResetLink('token123')
    expect(link).toContain('https://example.com/admin/reset-password?token=token123')
  })

  it('valida contraseñas seguras', () => {
    expect(validateNewPassword('ChangeMe123!')).toBeUndefined()
    expect(validateNewPassword('short1A')).toContain('al menos')
    expect(validateNewPassword('onlylowercase123')).toContain('mayúsculas')
  })
})
