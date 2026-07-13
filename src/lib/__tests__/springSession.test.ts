import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

describe('getSpringSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'true'
    process.env.BACKEND_URL = 'https://spring.example.com'
  })

  it('calls Spring /api/v1/auth/me with forwarded SESSIONID cookie', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['vacancies:read'] }
      })
    })

    const result = await getSpringSession('SESSIONID=abc123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/auth/me',
      {
        headers: {
          Cookie: 'SESSIONID=abc123'
        },
        credentials: 'omit'
      }
    )
    expect(result).toEqual({
      userId: 'user-1',
      email: 'admin@test.com',
      nombreUsuario: 'admin',
      rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['vacancies:read'] }
    })
  })

  it('returns null when Spring returns 401', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401
    })

    const result = await getSpringSession('SESSIONID=expired')

    expect(result).toBeNull()
  })

  it('returns null when Spring returns 403', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 403
    })

    const result = await getSpringSession('SESSIONID=forbidden')

    expect(result).toBeNull()
  })

  it('returns null when SPRING_AUTH_ENABLED is false', async () => {
    process.env.SPRING_AUTH_ENABLED = 'false'
    const { getSpringSession } = await import('../springSession')

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when BACKEND_URL is not set', async () => {
    delete process.env.BACKEND_URL
    const { getSpringSession } = await import('../springSession')

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when fetch throws a network error', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toBeNull()
  })
})
