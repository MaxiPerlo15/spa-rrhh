import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type RateLimitModule = typeof import('../rateLimit')

const ORIGINAL_ENV = process.env

const restoreEnv = () => {
  process.env = { ...ORIGINAL_ENV }
}

const clearRateLimitStore = () => {
  ;(globalThis as { rateLimitStore?: Map<string, unknown> }).rateLimitStore?.clear()
}

const loadRateLimit = async (envOverrides: Record<string, string | undefined> = {}) => {
  vi.resetModules()
  restoreEnv()
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }
    process.env[key] = value
  }
  return (await import('../rateLimit')) as RateLimitModule
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-22T00:00:00.000Z'))
    vi.restoreAllMocks()
    restoreEnv()
    clearRateLimitStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    restoreEnv()
    clearRateLimitStore()
  })

  it('usa memoria local en entorno no productivo cuando no hay Upstash', async () => {
    const { rateLimit } = await loadRateLimit({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })

    const first = await rateLimit({
      key: 'local-user',
      windowMs: 60_000,
      maxRequests: 2
    })
    const second = await rateLimit({
      key: 'local-user',
      windowMs: 60_000,
      maxRequests: 2
    })
    const third = await rateLimit({
      key: 'local-user',
      windowMs: 60_000,
      maxRequests: 2
    })

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it('en producción deniega si faltan credenciales Upstash (fail-closed)', async () => {
    const { rateLimit } = await loadRateLimit({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })

    const result = await rateLimit({
      key: 'prod-user',
      windowMs: 60_000,
      maxRequests: 5
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('en producción deniega si Upstash falla (fail-closed)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network error')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rateLimit } = await loadRateLimit({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token'
    })

    const result = await rateLimit({
      key: 'prod-user-fetch-failure',
      windowMs: 60_000,
      maxRequests: 5
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('usa store compartido cuando Upstash responde correctamente', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/INCR/')) {
        return {
          ok: true,
          json: async () => ({ result: 1 })
        } as Response
      }
      if (url.includes('/PTTL/')) {
        return {
          ok: true,
          json: async () => ({ result: 45_000 })
        } as Response
      }
      return {
        ok: true,
        json: async () => ({ result: 'OK' })
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rateLimit } = await loadRateLimit({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token'
    })

    const result = await rateLimit({
      key: 'shared-user',
      windowMs: 60_000,
      maxRequests: 3
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('getClientIp prioriza x-forwarded-for y luego x-real-ip', async () => {
    const { getClientIp } = await loadRateLimit({
      NODE_ENV: 'test'
    })

    const forwardedHeaders = new Headers({
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      'x-real-ip': '10.0.0.9'
    })
    expect(getClientIp(forwardedHeaders)).toBe('10.0.0.1')

    const realIpHeaders = new Headers({
      'x-real-ip': '10.0.0.9'
    })
    expect(getClientIp(realIpHeaders)).toBe('10.0.0.9')

    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
