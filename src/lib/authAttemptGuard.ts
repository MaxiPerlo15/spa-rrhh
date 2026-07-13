type AttemptState = {
  failures: number
  lastFailureAt: number
  lockUntil: number
}

type AttemptLockResult = {
  blocked: boolean
  retryAfterSeconds: number
  degraded?: boolean
}

type AttemptFailureResult = AttemptLockResult & {
  failures: number
}

const RESET_AFTER_MS = 24 * 60 * 60 * 1000
const RESET_AFTER_SECONDS = Math.ceil(RESET_AFTER_MS / 1000)
const PRODUCTION_OUTAGE_RETRY_AFTER_SECONDS = 60

const LOCK_RULES: Array<{ minFailures: number; lockMs: number }> = [
  { minFailures: 10, lockMs: 2 * 60 * 60 * 1000 },
  { minFailures: 8, lockMs: 30 * 60 * 1000 },
  { minFailures: 5, lockMs: 10 * 60 * 1000 }
]

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
const isSharedStoreEnabled = Boolean(upstashUrl && upstashToken)
const isDevBypassEnabled =
  process.env.NODE_ENV === 'development' && process.env.AUTH_ATTEMPT_GUARD_DEV_BYPASS !== 'false'

const globalForAttemptGuard = globalThis as unknown as {
  authAttemptStore?: Map<string, AttemptState>
}

const authAttemptStore = globalForAttemptGuard.authAttemptStore ?? new Map<string, AttemptState>()
if (!globalForAttemptGuard.authAttemptStore) {
  globalForAttemptGuard.authAttemptStore = authAttemptStore
}

function buildKey(scope: string, identity: string) {
  return `${scope}:${identity}`
}

function buildSharedKeys(scope: string, identity: string) {
  const base = `auth-attempt:${scope}:${identity}`
  return {
    failureKey: `${base}:failures`,
    lockKey: `${base}:lock`
  }
}

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

function getLockMsByFailures(failures: number) {
  if (isDevBypassEnabled) {
    return 0
  }
  const rule = LOCK_RULES.find((candidate) => failures >= candidate.minFailures)
  return rule?.lockMs ?? 0
}

function buildProductionOutageLockResult(): AttemptLockResult {
  return {
    blocked: true,
    retryAfterSeconds: PRODUCTION_OUTAGE_RETRY_AFTER_SECONDS,
    degraded: true
  }
}

function buildProductionOutageFailureResult(): AttemptFailureResult {
  return {
    ...buildProductionOutageLockResult(),
    failures: 1
  }
}

function getFreshState(key: string, now: number): AttemptState {
  const existing = authAttemptStore.get(key)
  if (!existing) {
    return { failures: 0, lastFailureAt: 0, lockUntil: 0 }
  }

  if (now - existing.lastFailureAt > RESET_AFTER_MS) {
    return { failures: 0, lastFailureAt: 0, lockUntil: 0 }
  }

  return existing
}

async function memoryGetAttemptLock(scope: string, identity: string): Promise<AttemptLockResult> {
  const now = Date.now()
  const key = buildKey(scope, identity)
  const state = getFreshState(key, now)

  if (state.lockUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((state.lockUntil - now) / 1000))
    }
  }

  return {
    blocked: false,
    retryAfterSeconds: 0
  }
}

async function sharedGetAttemptLock(scope: string, identity: string): Promise<AttemptLockResult> {
  const { lockKey } = buildSharedKeys(scope, identity)
  const ttlMs = await executeUpstashCommand<number>('PTTL', lockKey)

  if (ttlMs > 0) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000))
    }
  }

  return {
    blocked: false,
    retryAfterSeconds: 0
  }
}

export async function getAttemptLock(scope: string, identity: string): Promise<AttemptLockResult> {
  if (isDevBypassEnabled) {
    return {
      blocked: false,
      retryAfterSeconds: 0
    }
  }

  if (isSharedStoreEnabled) {
    try {
      return await sharedGetAttemptLock(scope, identity)
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return buildProductionOutageLockResult()
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    return buildProductionOutageLockResult()
  }

  return memoryGetAttemptLock(scope, identity)
}

async function memoryRecordAttemptFailure(scope: string, identity: string): Promise<AttemptFailureResult> {
  const now = Date.now()
  const key = buildKey(scope, identity)
  const state = getFreshState(key, now)
  const nextFailures = state.failures + 1
  const lockMs = getLockMsByFailures(nextFailures)

  const nextState: AttemptState = {
    failures: nextFailures,
    lastFailureAt: now,
    lockUntil: lockMs > 0 ? now + lockMs : 0
  }

  authAttemptStore.set(key, nextState)

  if (nextState.lockUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((nextState.lockUntil - now) / 1000)),
      failures: nextFailures
    }
  }

  return {
    blocked: false,
    retryAfterSeconds: 0,
    failures: nextFailures
  }
}

async function sharedRecordAttemptFailure(scope: string, identity: string): Promise<AttemptFailureResult> {
  const { failureKey, lockKey } = buildSharedKeys(scope, identity)
  const failures = await executeUpstashCommand<number>('INCR', failureKey)

  if (failures === 1) {
    await executeUpstashCommand('EXPIRE', failureKey, RESET_AFTER_SECONDS)
  }

  const lockMs = getLockMsByFailures(failures)
  if (lockMs > 0) {
    await executeUpstashCommand('PSETEX', lockKey, lockMs, '1')
  }

  const lockState = await sharedGetAttemptLock(scope, identity)
  return {
    blocked: lockState.blocked,
    retryAfterSeconds: lockState.retryAfterSeconds,
    failures
  }
}

export async function recordAttemptFailure(scope: string, identity: string): Promise<AttemptFailureResult> {
  if (isSharedStoreEnabled) {
    try {
      return await sharedRecordAttemptFailure(scope, identity)
    } catch {
      if (process.env.NODE_ENV === 'production') {
        return buildProductionOutageFailureResult()
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    return buildProductionOutageFailureResult()
  }

  return memoryRecordAttemptFailure(scope, identity)
}

async function memoryClearAttemptFailures(scope: string, identity: string) {
  const key = buildKey(scope, identity)
  authAttemptStore.delete(key)
}

async function sharedClearAttemptFailures(scope: string, identity: string) {
  const { failureKey, lockKey } = buildSharedKeys(scope, identity)
  await executeUpstashCommand('DEL', failureKey, lockKey)
}

export async function clearAttemptFailures(scope: string, identity: string) {
  if (isSharedStoreEnabled) {
    try {
      await sharedClearAttemptFailures(scope, identity)
    } catch {
      await memoryClearAttemptFailures(scope, identity)
      return
    }

    await memoryClearAttemptFailures(scope, identity)
    return
  }

  await memoryClearAttemptFailures(scope, identity)
}
