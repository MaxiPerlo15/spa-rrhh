import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn()
}))

vi.mock('@/lib/redaction', () => ({
  redactSensitiveData: (data: unknown) => data
}))

describe('logger', () => {
  const originalEnv = process.env
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    process.env = { ...originalEnv }
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Sentry = await import('@sentry/nextjs')
    vi.mocked(Sentry.captureException).mockClear()
    vi.mocked(Sentry.captureMessage).mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('error logs with Error instance', async () => {
    const { logger } = await import('@/lib/logger')
    const error = new Error('test error')
    logger.error('Something failed', error, { key: 'value' })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] Something failed',
      { name: 'Error', message: 'test error' },
      { key: 'value' }
    )
  })

  it('error logs with non-Error value', async () => {
    const { logger } = await import('@/lib/logger')
    logger.error('Something failed', 'string error')
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('error sends to Sentry in production', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    const Sentry = await import('@sentry/nextjs')
    const { logger } = await import('@/lib/logger')
    logger.error('Critical error', new Error('boom'), { ctx: 'data' })
    expect(Sentry.captureException).toHaveBeenCalled()
  })

  it('error does not send to Sentry in development', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'development'
    const Sentry = await import('@sentry/nextjs')
    const { logger } = await import('@/lib/logger')
    logger.error('Error', new Error('boom'))
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('info logs message with context', async () => {
    const { logger } = await import('@/lib/logger')
    logger.info('Info message', { detail: 'test' })
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Info message', { detail: 'test' })
  })

  it('info logs without context', async () => {
    const { logger } = await import('@/lib/logger')
    logger.info('Info message')
    expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Info message', '')
  })

  it('warn logs message', async () => {
    const { logger } = await import('@/lib/logger')
    logger.warn('Warning', { reason: 'test' })
    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning', { reason: 'test' })
  })

  it('security logs and sends to Sentry in production', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    const Sentry = await import('@sentry/nextjs')
    const { logger } = await import('@/lib/logger')
    logger.security('login_failed', { ip: '127.0.0.1' })
    expect(consoleWarnSpy).toHaveBeenCalled()
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'SECURITY:login_failed',
      expect.objectContaining({ level: 'warning' })
    )
  })

  it('security does not send to Sentry in development', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'development'
    const Sentry = await import('@sentry/nextjs')
    const { logger } = await import('@/lib/logger')
    logger.security('login_failed')
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('debug logs only in development', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'development'
    const { logger } = await import('@/lib/logger')
    logger.debug('Debug info', { data: 123 })
    expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] Debug info', { data: 123 })
  })

  it('debug does not log in production', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    const { logger } = await import('@/lib/logger')
    logger.debug('Debug info')
    expect(consoleLogSpy).not.toHaveBeenCalled()
  })
})
