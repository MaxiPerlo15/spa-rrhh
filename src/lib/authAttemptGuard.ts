type AttemptState = {
  failures: number
  lastFailureAt: number
  lockUntil: number
}

const RESET_AFTER_MS = 24 * 60 * 60 * 1000

const LOCK_RULES: Array<{ minFailures: number; lockMs: number }> = [
  { minFailures: 10, lockMs: 2 * 60 * 60 * 1000 },
  { minFailures: 8, lockMs: 30 * 60 * 1000 },
  { minFailures: 5, lockMs: 10 * 60 * 1000 }
]

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

function getLockMsByFailures(failures: number) {
  const rule = LOCK_RULES.find((candidate) => failures >= candidate.minFailures)
  return rule?.lockMs ?? 0
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

export function getAttemptLock(scope: string, identity: string) {
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

export function recordAttemptFailure(scope: string, identity: string) {
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

export function clearAttemptFailures(scope: string, identity: string) {
  const key = buildKey(scope, identity)
  authAttemptStore.delete(key)
}

