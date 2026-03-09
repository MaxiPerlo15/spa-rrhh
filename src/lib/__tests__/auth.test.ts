import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findUniqueMock,
  getAttemptLockMock,
  recordAttemptFailureMock,
  clearAttemptFailuresMock,
  securityMock,
  infoMock,
  compareMock
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  getAttemptLockMock: vi.fn(),
  recordAttemptFailureMock: vi.fn(),
  clearAttemptFailuresMock: vi.fn(),
  securityMock: vi.fn(),
  infoMock: vi.fn(),
  compareMock: vi.fn()
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: (config: unknown) => config
}))

vi.mock('bcrypt', () => ({
  default: {
    compare: compareMock
  }
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock
    }
  }
}))

vi.mock('@/lib/authAttemptGuard', () => ({
  getAttemptLock: getAttemptLockMock,
  recordAttemptFailure: recordAttemptFailureMock,
  clearAttemptFailures: clearAttemptFailuresMock
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    security: securityMock,
    info: infoMock
  }
}))

import { authorizeAdminCredentials } from '../auth'

describe('auth authorizeAdminCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAttemptLockMock.mockResolvedValue({ blocked: false, retryAfterSeconds: 0 })
    recordAttemptFailureMock.mockResolvedValue({
      failures: 1,
      blocked: false,
      retryAfterSeconds: 0
    })
    clearAttemptFailuresMock.mockResolvedValue(undefined)
  })

  it('permite login a cualquier usuario ADMIN existente aunque no coincida con ADMIN_EMAIL', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'admin-2',
      email: 'admin2@empresa.com',
      name: 'Admin Dos',
      role: 'ADMIN',
      passwordHash: 'hashed'
    })
    compareMock.mockResolvedValue(true)

    const result = await authorizeAdminCredentials(
      {
        email: 'admin2@empresa.com',
        password: 'Password123!'
      },
      {
        headers: {
          'x-forwarded-for': '127.0.0.1'
        }
      }
    )

    expect(result).toEqual({
      id: 'admin-2',
      email: 'admin2@empresa.com',
      name: 'Admin Dos',
      role: 'ADMIN'
    })
    expect(clearAttemptFailuresMock).toHaveBeenCalledWith('login', 'admin2@empresa.com:127.0.0.1')
  })

  it('rechaza usuarios existentes que no son admin', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@empresa.com',
      name: 'User',
      role: 'USER',
      passwordHash: 'hashed'
    })

    const result = await authorizeAdminCredentials(
      {
        email: 'user@empresa.com',
        password: 'Password123!'
      },
      {
        headers: {
          'x-forwarded-for': '127.0.0.1'
        }
      }
    )

    expect(result).toBeNull()
    expect(recordAttemptFailureMock).toHaveBeenCalledWith('login', 'user@empresa.com:127.0.0.1')
  })

  it('rechaza password inválida para admin', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@empresa.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: 'hashed'
    })
    compareMock.mockResolvedValue(false)

    const result = await authorizeAdminCredentials(
      {
        email: 'admin@empresa.com',
        password: 'wrong-password'
      },
      {
        headers: {
          'x-forwarded-for': '127.0.0.1'
        }
      }
    )

    expect(result).toBeNull()
    expect(recordAttemptFailureMock).toHaveBeenCalledWith('login', 'admin@empresa.com:127.0.0.1')
  })
})
