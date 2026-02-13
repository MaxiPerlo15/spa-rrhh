import * as Sentry from '@sentry/nextjs'
import { redactSensitiveData } from '@/lib/redaction'

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
    const safeContext = context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined
    const safeError =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : (redactSensitiveData(error) as unknown)

    console.error(`[ERROR] ${message}`, safeError, safeContext || '')
    
    // Solo enviar a Sentry en producción
    if (process.env.NODE_ENV !== 'development') {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          log_level: 'error',
        },
        extra: {
          message,
          ...safeContext,
        },
      })
    }
  },

  /**
   * Registra información general
   * Solo imprime en consola, NO envía a Sentry
   */
  info: (message: string, context?: Record<string, unknown>) => {
    const safeContext = context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined
    console.log(`[INFO] ${message}`, safeContext || '')
  },

  /**
   * Registra advertencias
   * Imprime en consola, NO envía a Sentry
   */
  warn: (message: string, context?: Record<string, unknown>) => {
    const safeContext = context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined
    console.warn(`[WARN] ${message}`, safeContext || '')
  },

  /**
   * Registra un evento de seguridad con contexto estructurado.
   * Se envía a Sentry en producción para habilitar alertas operativas.
   */
  security: (event: string, context?: Record<string, unknown>) => {
    const safeContext = context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined
    console.warn(`[SECURITY] ${event}`, safeContext || '')

    if (process.env.NODE_ENV !== 'development') {
      Sentry.captureMessage(`SECURITY:${event}`, {
        level: 'warning',
        tags: {
          log_level: 'warning',
          category: 'security',
          security_event: event
        },
        extra: {
          ...safeContext
        }
      })
    }
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
