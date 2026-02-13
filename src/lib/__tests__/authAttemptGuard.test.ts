import { describe, expect, it } from 'vitest'
import { clearAttemptFailures, getAttemptLock, recordAttemptFailure } from '../authAttemptGuard'

describe('authAttemptGuard', () => {
  it('bloquea temporalmente luego de múltiples fallos', () => {
    const scope = 'login'
    const identity = `test-user-${Date.now()}`

    for (let i = 0; i < 5; i += 1) {
      recordAttemptFailure(scope, identity)
    }

    const lockState = getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(true)
    expect(lockState.retryAfterSeconds).toBeGreaterThan(0)

    clearAttemptFailures(scope, identity)
  })

  it('limpia bloqueo tras clear', () => {
    const scope = 'reset-password'
    const identity = `test-token-${Date.now()}`

    for (let i = 0; i < 5; i += 1) {
      recordAttemptFailure(scope, identity)
    }

    clearAttemptFailures(scope, identity)
    const lockState = getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(false)
  })
})

