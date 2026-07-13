import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureExceptionMock,
  captureMessageMock
} = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  captureMessageMock: vi.fn()
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock
}))

import { logger } from '../logger'

describe('logger', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redacta contexto sensible y evita enviar errores a Sentry en desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'development')

    logger.error('Fallo', new Error('boom'), {
      email: 'admin@empresa.com',
      token: 'secret-token'
    })

    expect(errorSpy).toHaveBeenCalledWith('[ERROR] Fallo', { name: 'Error', message: 'boom' }, {
      email: 'ad***om',
      token: 'se***en'
    })
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it('envía errores y eventos de seguridad a Sentry fuera de desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'production')

    logger.error('Fallo', 'plain failure', {
      phone: '+5493511234567'
    })
    logger.security('auth.login.failed', {
      ip: '203.0.113.10'
    })

    expect(captureExceptionMock).toHaveBeenCalledOnce()
    expect(captureMessageMock).toHaveBeenCalledWith('SECURITY:auth.login.failed', {
      level: 'warning',
      tags: {
        log_level: 'warning',
        category: 'security',
        security_event: 'auth.login.failed'
      },
      extra: {
        ip: '20***10'
      }
    })
  })

  it('solo loguea debug en desarrollo y warn/info siempre imprimen', () => {
    vi.stubEnv('NODE_ENV', 'production')
    logger.info('Info', { feature: 'contacts' })
    logger.warn('Warn', { password: 'Password123!' })
    logger.debug('Debug prod', { ignored: true })

    expect(logSpy).toHaveBeenCalledWith('[INFO] Info', { feature: 'contacts' })
    expect(warnSpy).toHaveBeenCalledWith('[WARN] Warn', { password: 'Pa***3!' })
    expect(logSpy).not.toHaveBeenCalledWith('[DEBUG] Debug prod', { ignored: true })

    vi.stubEnv('NODE_ENV', 'development')
    logger.debug('Debug dev', { enabled: true })
    expect(logSpy).toHaveBeenCalledWith('[DEBUG] Debug dev', { enabled: true })
  })
})
