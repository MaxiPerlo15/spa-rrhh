import { describe, expect, it, vi } from 'vitest'

// Mock next-auth/next — auth() should still work but with no providers
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue(null)
}))

// Mock next-auth/providers/credentials — should NOT be imported after decommission
vi.mock('next-auth/providers/credentials', () => ({
  default: (config: unknown) => config
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {}
}))

vi.mock('@/lib/authAttemptGuard', () => ({
  getAttemptLock: vi.fn(),
  recordAttemptFailure: vi.fn(),
  clearAttemptFailures: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    security: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

import { authOptions, auth } from '../auth'

describe('auth.ts — decommissioned Prisma auth', () => {
  it('authOptions has no Credentials provider (empty providers array)', () => {
    // After decommission, all credential-based providers are removed.
    // The providers array should be empty or contain no Credentials entry.
    expect(authOptions.providers).toBeDefined()
    expect(Array.isArray(authOptions.providers)).toBe(true)
    expect(authOptions.providers).toHaveLength(0)
  })

  it('auth() returns a session result without throwing', async () => {
    // auth() should still be callable — it wraps getServerSession
    const session = await auth()
    // With no providers, getServerSession returns null
    expect(session).toBeNull()
  })

  it('does not export authorizeAdminCredentials', async () => {
    // The authorizeAdminCredentials function should be removed entirely.
    // Importing it should fail or be undefined.
    const authModule = await import('../auth')
    expect((authModule as Record<string, unknown>).authorizeAdminCredentials).toBeUndefined()
  })

  it('authOptions.secret is read from env', () => {
    // secret may be undefined in test env (NEXTAUTH_SECRET not set),
    // but the config property should exist on authOptions
    expect('secret' in authOptions).toBe(true)
  })
})
