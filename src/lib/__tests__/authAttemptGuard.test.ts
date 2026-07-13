import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type GuardModule = typeof import('../authAttemptGuard')

const ORIGINAL_ENV = process.env

const restoreEnv = () => {
  process.env = { ...ORIGINAL_ENV }
}

const clearGuardStore = () => {
  ;(globalThis as { authAttemptStore?: Map<string, unknown> }).authAttemptStore?.clear()
}

const loadGuard = async (envOverrides: Record<string, string | undefined> = {}) => {
  vi.resetModules()
  restoreEnv()
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete process.env[key]
      continue
    }
    process.env[key] = value
  }
  return (await import('../authAttemptGuard')) as GuardModule
}

describe('authAttemptGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-21T00:00:00.000Z'))
    vi.restoreAllMocks()
    restoreEnv()
    clearGuardStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    restoreEnv()
    clearGuardStore()
  })

  it('bloquea temporalmente luego de múltiples fallos y limpia con clear', async () => {
    const { clearAttemptFailures, getAttemptLock, recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })
    const scope = 'login'
    const identity = 'test-user-lock'

    for (let i = 0; i < 5; i += 1) {
      await recordAttemptFailure(scope, identity)
    }

    const lockState = await getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(true)
    expect(lockState.retryAfterSeconds).toBeGreaterThanOrEqual(590)

    await clearAttemptFailures(scope, identity)
    const clearState = await getAttemptLock(scope, identity)
    expect(clearState.blocked).toBe(false)
    expect(clearState.retryAfterSeconds).toBe(0)
  })

  it('resetea contador local cuando pasa la ventana de 24 horas', async () => {
    const { recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })

    const scope = 'login'
    const identity = 'reset-window-user'
    for (let i = 0; i < 4; i += 1) {
      await recordAttemptFailure(scope, identity)
    }

    vi.setSystemTime(new Date('2026-02-22T00:01:00.000Z'))
    const result = await recordAttemptFailure(scope, identity)
    expect(result.failures).toBe(1)
    expect(result.blocked).toBe(false)
  })

  it('omite bloqueos en desarrollo cuando bypass está activo', async () => {
    const { getAttemptLock, recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'development',
      AUTH_ATTEMPT_GUARD_DEV_BYPASS: 'true',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })

    const scope = 'login'
    const identity = 'dev-bypass-user'
    for (let i = 0; i < 12; i += 1) {
      const result = await recordAttemptFailure(scope, identity)
      expect(result.blocked).toBe(false)
    }
    const state = await getAttemptLock(scope, identity)
    expect(state.blocked).toBe(false)
    expect(state.retryAfterSeconds).toBe(0)
  })

  it('hace fallback a memoria si falla el store compartido (Upstash)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network error')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { clearAttemptFailures, getAttemptLock, recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token'
    })

    const scope = 'login'
    const identity = 'fallback-user'

    for (let i = 0; i < 5; i += 1) {
      await recordAttemptFailure(scope, identity)
    }
    const state = await getAttemptLock(scope, identity)
    expect(state.blocked).toBe(true)

    await clearAttemptFailures(scope, identity)
    const clearState = await getAttemptLock(scope, identity)
    expect(clearState.blocked).toBe(false)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('en producción bloquea si Upstash falla', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network error')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { clearAttemptFailures, getAttemptLock, recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token'
    })

    const scope = 'login'
    const identity = 'prod-store-failure'

    const lockState = await getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(true)
    expect(lockState.retryAfterSeconds).toBe(60)
    expect(lockState.degraded).toBe(true)

    const failureState = await recordAttemptFailure(scope, identity)
    expect(failureState.blocked).toBe(true)
    expect(failureState.retryAfterSeconds).toBe(60)
    expect(failureState.failures).toBe(1)
    expect(failureState.degraded).toBe(true)

    await clearAttemptFailures(scope, identity)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('en producción bloquea si faltan credenciales Upstash', async () => {
    const { getAttemptLock, recordAttemptFailure } = await loadGuard({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined
    })

    const lockState = await getAttemptLock('login', 'prod-no-store')
    expect(lockState.blocked).toBe(true)
    expect(lockState.retryAfterSeconds).toBe(60)
    expect(lockState.degraded).toBe(true)

    const failureState = await recordAttemptFailure('login', 'prod-no-store')
    expect(failureState.blocked).toBe(true)
    expect(failureState.retryAfterSeconds).toBe(60)
    expect(failureState.failures).toBe(1)
    expect(failureState.degraded).toBe(true)
  })

  it('usa lock distribuido cuando Upstash responde PTTL positivo', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/PTTL/')) {
        return {
          ok: true,
          json: async () => ({ result: 45_000 })
        } as Response
      }
      return {
        ok: true,
        json: async () => ({ result: 1 })
      } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getAttemptLock } = await loadGuard({
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token'
    })

    const state = await getAttemptLock('login', 'shared-user')
    expect(state.blocked).toBe(true)
    expect(state.retryAfterSeconds).toBeGreaterThan(0)
  })
})
