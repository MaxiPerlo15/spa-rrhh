type ValidationContext = {
  isProduction: boolean
}

type ParsedDatabaseUrl = {
  url: URL
  isNeonHost: boolean
  isNeonPoolerHost: boolean
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

function validateBackendUrl(context: ValidationContext, errors: string[], warnings: string[]) {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return

  validateUrlVar('BACKEND_URL', errors)

  try {
    const url = new URL(backendUrl)
    const protocol = url.protocol.toLowerCase()
    const hostname = url.hostname.toLowerCase()

    if (protocol !== 'http:' && protocol !== 'https:') {
      errors.push('- BACKEND_URL must use http/https protocol')
    }

    if (context.isProduction && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')) {
      errors.push('- BACKEND_URL cannot point to localhost in production')
    }
  } catch {
    return
  }

  if (!process.env.BACKEND_INTERNAL_API_TOKEN?.trim()) {
    if (context.isProduction) {
      errors.push('- BACKEND_INTERNAL_API_TOKEN (required when BACKEND_URL is configured)')
    } else {
      warnings.push('- BACKEND_URL is configured without BACKEND_INTERNAL_API_TOKEN; protected Spring routes will reject the proxy')
    }
  }
}

function parseDatabaseUrl(value: string, errors: string[]): ParsedDatabaseUrl | null {
  try {
    const url = new URL(value)
    const protocol = url.protocol.toLowerCase()

    if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
      errors.push('- DATABASE_URL debe usar protocolo postgres/postgresql')
      return null
    }

    const hostname = url.hostname.toLowerCase()

    return {
      url,
      isNeonHost: hostname.endsWith('.neon.tech'),
      isNeonPoolerHost: hostname.includes('-pooler.')
    }
  } catch {
    errors.push('- DATABASE_URL debe ser una URL válida')
    return null
  }
}

function validateDatabaseUrl(context: ValidationContext, errors: string[], warnings: string[]) {
  const value = process.env.DATABASE_URL
  if (!value) return

  const parsed = parseDatabaseUrl(value, errors)
  if (!parsed) return

  const { url, isNeonHost, isNeonPoolerHost } = parsed
  const hostname = url.hostname.toLowerCase()
  const sslmode = url.searchParams.get('sslmode')?.toLowerCase()

  if (!context.isProduction) {
    return
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    errors.push('- DATABASE_URL no puede apuntar a localhost en producción')
  }

  if (sslmode === 'disable') {
    errors.push('- DATABASE_URL no puede deshabilitar SSL en producción')
  }

  if (isNeonHost && !isNeonPoolerHost) {
    warnings.push(
      '- DATABASE_URL apunta a Neon sin hostname de pooler; con pg.Pool + PrismaPg conviene usar el endpoint pooled para evitar límites de conexión'
    )
  }

  if (isNeonHost && !sslmode) {
    warnings.push('- DATABASE_URL de Neon no declara sslmode; verificar que el secret use el string recomendado por Neon')
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
  }

  validateDatabaseUrl(context, errors, warnings)
  validateBackendUrl(context, errors, warnings)

  // The server-side proxy and browser bundle must select the same auth mode.
  const springAuthEnabled = process.env.SPRING_AUTH_ENABLED === 'true'
  const browserSpringAuthEnabled = process.env.NEXT_PUBLIC_SPRING_AUTH_ENABLED === 'true'
  if (springAuthEnabled !== browserSpringAuthEnabled) {
    errors.push('- SPRING_AUTH_ENABLED and NEXT_PUBLIC_SPRING_AUTH_ENABLED must match')
  }

  // Spring auth feature flag validation
  if (springAuthEnabled) {
    if (!process.env.BACKEND_URL) {
      errors.push('- BACKEND_URL is required when SPRING_AUTH_ENABLED is true')
    }
  }

  const publicSpringAuthEnabled = process.env.NEXT_PUBLIC_SPRING_AUTH_ENABLED
  if (publicSpringAuthEnabled && publicSpringAuthEnabled !== process.env.SPRING_AUTH_ENABLED) {
    errors.push('- NEXT_PUBLIC_SPRING_AUTH_ENABLED must match SPRING_AUTH_ENABLED')
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
