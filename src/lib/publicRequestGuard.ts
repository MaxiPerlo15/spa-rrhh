import { UploadThingError } from 'uploadthing/server'
import { verifyTurnstileToken } from '@/lib/botProtection'
import { logger } from '@/lib/logger'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

type CaptchaAction = 'contact_form' | 'application_form'
type LogKind = 'warn' | 'security'

type GuardLogConfig = {
  kind: LogKind
  message: string
}

type PublicRequestGuardConfig = {
  headers: Headers
  captchaToken?: string
  captchaAction: CaptchaAction
  rateLimitKey: string
  maxRequests: number
  windowMs?: number
  rateLimitLog: GuardLogConfig
  captchaLog: GuardLogConfig
}

export class PublicRequestGuardError extends Error {
  status: number
  retryAfterSeconds?: number

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.name = 'PublicRequestGuardError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function logGuardEvent(
  config: GuardLogConfig,
  context: Record<string, unknown>
) {
  if (config.kind === 'security') {
    logger.security(config.message, context)
    return
  }
  logger.warn(config.message, context)
}

export function isPublicRequestGuardError(error: unknown): error is PublicRequestGuardError {
  return error instanceof PublicRequestGuardError
}

export function toUploadThingGuardError(error: PublicRequestGuardError) {
  return new UploadThingError(error.message)
}

export async function guardPublicRequest(config: PublicRequestGuardConfig) {
  const clientIp = getClientIp(config.headers)
  const rateLimitResult = await rateLimit({
    key: `${config.rateLimitKey}:${clientIp}`,
    windowMs: config.windowMs ?? 10 * 60 * 1000,
    maxRequests: config.maxRequests
  })

  if (!rateLimitResult.allowed) {
    logGuardEvent(config.rateLimitLog, {
      ip: clientIp,
      retryAfterSeconds: rateLimitResult.retryAfterSeconds
    })
    throw new PublicRequestGuardError(
      `Demasiadas solicitudes. Intenta nuevamente en ${rateLimitResult.retryAfterSeconds}s.`,
      429,
      rateLimitResult.retryAfterSeconds
    )
  }

  const captchaVerification = await verifyTurnstileToken({
    token: config.captchaToken,
    remoteIp: clientIp,
    action: config.captchaAction
  })

  if (!captchaVerification.success) {
    logGuardEvent(config.captchaLog, {
      ip: clientIp,
      reason: captchaVerification.reason
    })
    throw new PublicRequestGuardError('No se pudo verificar el captcha', 400)
  }

  return {
    clientIp
  }
}
