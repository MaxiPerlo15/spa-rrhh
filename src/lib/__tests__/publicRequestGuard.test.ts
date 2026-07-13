import { describe, expect, it, vi, beforeEach } from 'vitest'

const rateLimitMock = vi.fn()
const verifyTurnstileTokenMock = vi.fn()
const loggerMock = {
  warn: vi.fn(),
  security: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
}

vi.mock('@/lib/rateLimit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimit: rateLimitMock
}))

vi.mock('@/lib/botProtection', () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock
}))

vi.mock('@/lib/logger', () => ({
  logger: loggerMock
}))

describe('publicRequestGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 7, retryAfterSeconds: 0 })
    verifyTurnstileTokenMock.mockResolvedValue({ success: true })
  })

  it('returns clientIp when rate limit and captcha pass', async () => {
    const { guardPublicRequest } = await import('@/lib/publicRequestGuard')
    const result = await guardPublicRequest({
      headers: new Headers(),
      captchaAction: 'application_form',
      rateLimitKey: 'test',
      maxRequests: 10,
      rateLimitLog: { kind: 'warn', message: 'rate limited' },
      captchaLog: { kind: 'warn', message: 'captcha failed' }
    })
    expect(result).toEqual({ clientIp: '127.0.0.1' })
  })

  it('throws PublicRequestGuardError with 429 when rate limit exceeded', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 30 })
    const { guardPublicRequest, PublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    await expect(
      guardPublicRequest({
        headers: new Headers(),
        captchaAction: 'application_form',
        rateLimitKey: 'test',
        maxRequests: 10,
        rateLimitLog: { kind: 'warn', message: 'rate limited' },
        captchaLog: { kind: 'warn', message: 'captcha failed' }
      })
    ).rejects.toThrow(PublicRequestGuardError)
    expect(loggerMock.warn).toHaveBeenCalled()
  })

  it('throws with security log kind when configured', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 60 })
    const { guardPublicRequest } = await import('@/lib/publicRequestGuard')
    await expect(
      guardPublicRequest({
        headers: new Headers(),
        captchaAction: 'application_form',
        rateLimitKey: 'test',
        maxRequests: 10,
        rateLimitLog: { kind: 'security', message: 'suspicious activity' },
        captchaLog: { kind: 'warn', message: 'captcha failed' }
      })
    ).rejects.toThrow()
    expect(loggerMock.security).toHaveBeenCalled()
  })

  it('throws PublicRequestGuardError with 400 when captcha fails', async () => {
    verifyTurnstileTokenMock.mockResolvedValueOnce({ success: false, reason: 'invalid-token' })
    const { guardPublicRequest, PublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    await expect(
      guardPublicRequest({
        headers: new Headers(),
        captchaAction: 'application_form',
        rateLimitKey: 'test',
        maxRequests: 10,
        rateLimitLog: { kind: 'warn', message: 'rate limited' },
        captchaLog: { kind: 'warn', message: 'captcha failed' }
      })
    ).rejects.toThrow(PublicRequestGuardError)
  })

  it('isPublicRequestGuardError returns true for PublicRequestGuardError', async () => {
    const { isPublicRequestGuardError, PublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    const error = new PublicRequestGuardError('test', 429)
    expect(isPublicRequestGuardError(error)).toBe(true)
  })

  it('isPublicRequestGuardError returns false for regular Error', async () => {
    const { isPublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    expect(isPublicRequestGuardError(new Error('test'))).toBe(false)
  })

  it('isPublicRequestGuardError returns false for non-error values', async () => {
    const { isPublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    expect(isPublicRequestGuardError(null)).toBe(false)
    expect(isPublicRequestGuardError('string')).toBe(false)
    expect(isPublicRequestGuardError(42)).toBe(false)
  })

  it('PublicRequestGuardError stores status and retryAfterSeconds', async () => {
    const { PublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    const error = new PublicRequestGuardError('too many', 429, 30)
    expect(error.status).toBe(429)
    expect(error.retryAfterSeconds).toBe(30)
    expect(error.name).toBe('PublicRequestGuardError')
  })

  it('toUploadThingGuardError wraps error as UploadThingError', async () => {
    const { toUploadThingGuardError, PublicRequestGuardError } = await import('@/lib/publicRequestGuard')
    const guardError = new PublicRequestGuardError('captcha failed', 400)
    const uploadError = toUploadThingGuardError(guardError)
    expect(uploadError.message).toBe('captcha failed')
  })
})
