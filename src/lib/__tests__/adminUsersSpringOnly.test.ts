import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

import { createOrUpdateAdminUser, normalizeAdminEmail } from '../adminUsers'

describe('adminUsers — Spring-only mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'true'
    process.env.BACKEND_URL = 'https://spring.example.com'
    delete process.env.BACKEND_INTERNAL_API_TOKEN
  })

  it('normalizes email before delegating to Spring', () => {
    expect(normalizeAdminEmail(' Admin@Empresa.com ')).toBe('admin@empresa.com')
  })

  it('delegates user creation to Spring POST /api/v1/admin/users', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'spring-user-1',
        email: 'admin@empresa.com',
        name: 'Admin',
        role: 'ADMIN'
      })
    })

    const result = await createOrUpdateAdminUser(
      {} as never,
      { email: 'Admin@Empresa.com', password: 'Password123!', name: 'Admin' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/admin/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          email: 'admin@empresa.com',
          password: 'Password123!',
          name: 'Admin'
        })
      })
    )
    expect(result).toEqual({
      id: 'spring-user-1',
      email: 'admin@empresa.com',
      name: 'Admin',
      role: 'ADMIN'
    })
  })

  it('throws when Spring returns non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })

    await expect(
      createOrUpdateAdminUser(
        {} as never,
        { email: 'admin@test.com', password: 'pass' }
      )
    ).rejects.toThrow('Spring user creation failed: 500')
  })

  it('throws when BACKEND_URL is missing', async () => {
    delete process.env.BACKEND_URL

    await expect(
      createOrUpdateAdminUser(
        {} as never,
        { email: 'admin@test.com', password: 'pass' }
      )
    ).rejects.toThrow('BACKEND_URL is required')
  })

  it('includes X-Backend-Api-Key header when token is set', async () => {
    process.env.BACKEND_INTERNAL_API_TOKEN = 'test-secret-token'
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u-1', email: 'a@b.com', name: 'A', role: 'ADMIN' })
    })

    await createOrUpdateAdminUser(
      {} as never,
      { email: 'a@b.com', password: 'pass' }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Backend-Api-Key': 'test-secret-token'
        })
      })
    )
  })

  it('uses default name when name is not provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u-1', email: 'a@b.com', name: 'Administrador', role: 'ADMIN' })
    })

    await createOrUpdateAdminUser(
      {} as never,
      { email: 'a@b.com', password: 'pass' }
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.name).toBe('Administrador')
  })
})
