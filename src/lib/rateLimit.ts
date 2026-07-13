type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, RateLimitEntry>

const globalForRateLimit = globalThis as unknown as {
  rateLimitStore?: RateLimitStore
}

const rateLimitStore = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>()
if (!globalForRateLimit.rateLimitStore) {
  globalForRateLimit.rateLimitStore = rateLimitStore
}

type RateLimitResponse = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
  degraded?: boolean
}

function buildProductionOutageRateLimit(windowMs: number): RateLimitResponse {
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
    degraded: true
  }
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
const isSharedStoreEnabled = Boolean(upstashUrl && upstashToken)

async function executeUpstashCommand<T>(...command: (string | number)[]) {
  if (!upstashUrl || !upstashToken) {
    throw new Error('Upstash no configurado')
  }

  const encoded = command.map((value) => encodeURIComponent(String(value))).join('/')
  const response = await fetch(`${upstashUrl}/${encoded}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${upstashToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Upstash error: ${response.status}`)
  }

  const data = (await response.json()) as { result: T }
  return data.result
}

async function sharedRateLimit({
  key,
  windowMs,
  maxRequests
}: {
  key: string
  windowMs: number
  maxRequests: number
}): Promise<RateLimitResponse> {
  const namespacedKey = `ratelimit:${key}`
  const count = await executeUpstashCommand<number>('INCR', namespacedKey)

  if (count === 1) {
    await executeUpstashCommand('PEXPIRE', namespacedKey, windowMs)
  }

  const ttlMs = await executeUpstashCommand<number>('PTTL', namespacedKey)
  const remaining = Math.max(0, maxRequests - count)

  return {
    allowed: count <= maxRequests,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000))
  }
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(',').map((value) => value.trim())
    if (firstIp) return firstIp
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

export async function rateLimit({
  key,
  windowMs,
  maxRequests
}: {
  key: string
  windowMs: number
  maxRequests: number
}) {
  // Allow E2E tests to bypass rate limiting entirely
  if (process.env.E2E_BYPASS_RATE_LIMIT === 'true') {
    return {
      allowed: true,
      remaining: maxRequests,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    }
  }

  if (isSharedStoreEnabled) {
    try {
      return await sharedRateLimit({ key, windowMs, maxRequests })
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return buildProductionOutageRateLimit(windowMs)
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    return buildProductionOutageRateLimit(windowMs)
  }

  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    }
  }

  current.count += 1
  rateLimitStore.set(key, current)

  const remaining = Math.max(0, maxRequests - current.count)
  return {
    allowed: current.count <= maxRequests,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  }
}
