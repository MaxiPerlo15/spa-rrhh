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

export function rateLimit({
  key,
  windowMs,
  maxRequests
}: {
  key: string
  windowMs: number
  maxRequests: number
}) {
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
