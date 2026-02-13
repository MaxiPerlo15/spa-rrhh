import { describe, expect, it } from 'vitest'
import { clearAttemptFailures, getAttemptLock, recordAttemptFailure } from '../authAttemptGuard'

describe('authAttemptGuard', () => {
  it('bloquea temporalmente luego de múltiples fallos', async () => {
    const scope = 'login'
    const identity = `test-user-${Date.now()}`

    for (let i = 0; i < 5; i += 1) {
      await recordAttemptFailure(scope, identity)
    }

    const lockState = await getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(true)
    expect(lockState.retryAfterSeconds).toBeGreaterThan(0)

    await clearAttemptFailures(scope, identity)
  })

  it('limpia bloqueo tras clear', async () => {
    const scope = 'reset-password'
    const identity = `test-token-${Date.now()}`

    for (let i = 0; i < 5; i += 1) {
      await recordAttemptFailure(scope, identity)
    }

    await clearAttemptFailures(scope, identity)
    const lockState = await getAttemptLock(scope, identity)
    expect(lockState.blocked).toBe(false)
  })
})
