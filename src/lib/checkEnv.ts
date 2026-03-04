type ValidationContext = {
  isProduction: boolean
}

function requireVar(name: string, errors: string[]) {
  if (!process.env[name]) {
    errors.push(`- ${name}`)
  }
}

function validateUrlVar(name: string, errors: string[]) {
  const value = process.env[name]
  if (!value) return
  try {
    new URL(value)
  } catch {
    errors.push(`- ${name} debe ser una URL válida`)
  }
}

export function validateRuntimeEnv() {
  const context: ValidationContext = {
    isProduction: process.env.NODE_ENV === 'production'
  }

  const errors: string[] = []
  const warnings: string[] = []

  // Core runtime requirements
  requireVar('DATABASE_URL', errors)
  requireVar('NEXTAUTH_SECRET', errors)

  // Production-specific hard requirements
  if (context.isProduction) {
    requireVar('NEXTAUTH_URL', errors)
    requireVar('UPLOADTHING_TOKEN', errors)
    requireVar('NEXT_PUBLIC_TURNSTILE_SITE_KEY', errors)
    requireVar('TURNSTILE_SECRET_KEY', errors)
    requireVar('UPSTASH_REDIS_REST_URL', errors)
    requireVar('UPSTASH_REDIS_REST_TOKEN', errors)
    requireVar('AUDIT_CRON_SECRET', errors)
    requireVar('CV_RETENTION_CRON_SECRET', errors)
    requireVar('RESEND_API_KEY', errors)
    requireVar('FROM_EMAIL', errors)
    validateUrlVar('NEXTAUTH_URL', errors)
    validateUrlVar('UPSTASH_REDIS_REST_URL', errors)
    validateUrlVar('DATABASE_URL', errors)
  }

  // Integration-specific checks
  if (!context.isProduction && process.env.RESEND_API_KEY && !process.env.FROM_EMAIL) {
    errors.push('- FROM_EMAIL (required when RESEND_API_KEY is configured)')
  }

  if (!context.isProduction && !process.env.RESEND_API_KEY) {
    warnings.push('- RESEND_API_KEY no está configurada (emails en modo simulado)')
  }

  if (warnings.length > 0) {
    console.warn(`[ENV] Advertencias de configuración:\n${warnings.join('\n')}`)
  }

  if (errors.length > 0) {
    throw new Error(`Configuración de entorno inválida. Faltan variables requeridas:\n${errors.join('\n')}`)
  }
}
