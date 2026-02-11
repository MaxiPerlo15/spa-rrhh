const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

function normalizeToOrigin(value: string): string | null {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function readAllowedOriginsFromEnv() {
  const origins = new Set<string>()

  const appOrigin = process.env.NEXTAUTH_URL
  if (appOrigin) {
    const normalized = normalizeToOrigin(appOrigin)
    if (normalized) {
      origins.add(normalized)
    }
  }

  const configured = process.env.CORS_ALLOWED_ORIGINS
  if (configured) {
    for (const item of configured.split(',')) {
      const trimmed = item.trim()
      if (!trimmed) continue
      const normalized = normalizeToOrigin(trimmed)
      if (normalized) {
        origins.add(normalized)
      }
    }
  }

  return origins
}

const allowedOrigins = readAllowedOriginsFromEnv()

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true
  return allowedOrigins.has(origin)
}

export function applyCorsHeaders(headers: Headers, origin: string, requestedHeaders?: string | null) {
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS.join(', '))
  headers.set('Access-Control-Allow-Headers', requestedHeaders || DEFAULT_ALLOWED_HEADERS.join(', '))
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
}
