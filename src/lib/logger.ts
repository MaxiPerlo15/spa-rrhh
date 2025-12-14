import * as Sentry from '@sentry/nextjs'

/**
 * Logger centralizado que:
 * 1. Imprime en consola (desarrollo y producción)
 * 2. Envía errores críticos a Sentry (solo producción)
 */
export const logger = {
  /**
   * Registra un error crítico
   * Siempre imprime en consola + envía a Sentry en producción
   */
  error: (message: string, error: Error | unknown, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error)
    
    // Solo enviar a Sentry en producción
    if (process.env.NODE_ENV !== 'development') {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          log_level: 'error',
        },
        extra: {
          message,
          ...context,
        },
      })
    }
  },

  /**
   * Registra información general
   * Solo imprime en consola, NO envía a Sentry
   */
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[INFO] ${message}`, context || '')
  },

  /**
   * Registra advertencias
   * Imprime en consola, NO envía a Sentry
   */
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context || '')
  },

  /**
   * Registra información de debug
   * Solo en desarrollo
   */
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data || '')
    }
  },
}