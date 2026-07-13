const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

const PUBLIC_CORS_ROUTE_RULES = [
  {
    pattern: /^\/api\/vacancies(?:\/[^/]+)?$/,
    methods: new Set(['GET'])
  },
  {
    pattern: /^\/api\/applications$/,
    methods: new Set(['POST'])
  },
  {
    pattern: /^\/api\/contacts$/,
    methods: new Set(['POST'])
  }
] as const

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

function isLocalDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV === 'production') return false

  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function isAllowedOrigin(origin: string | null) {
  if (!origin) return true
  return readAllowedOriginsFromEnv().has(origin) || isLocalDevelopmentOrigin(origin)
}

export function isPublicCorsRequest(pathname: string, method: string) {
  return PUBLIC_CORS_ROUTE_RULES.some(({ pattern, methods }) => pattern.test(pathname) && methods.has(method.toUpperCase()))
}

export function applyCorsHeaders(
  headers: Headers,
  origin: string,
  requestedHeaders?: string | null,
  options?: { allowCredentials?: boolean }
) {
  headers.set('Access-Control-Allow-Origin', origin)
  if (options?.allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true')
  } else {
    headers.delete('Access-Control-Allow-Credentials')
  }
  headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS.join(', '))
  headers.set('Access-Control-Allow-Headers', requestedHeaders || DEFAULT_ALLOWED_HEADERS.join(', '))
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers')
}
