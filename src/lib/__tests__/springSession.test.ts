import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

describe('getSpringSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'true'
    process.env.BACKEND_URL = 'https://spring.example.com'
  })

  it('returns an authorized state when Spring grants admin:access', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Set-Cookie': 'SESSIONID=rotated; Path=/; HttpOnly; SameSite=Lax' }),
      json: async () => ({
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
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
      state: 'authorized',
      sessionCookie: 'SESSIONID=rotated; Path=/; HttpOnly; SameSite=Lax',
      user: {
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
      }
    })
  })

  it('returns an anonymous state when Spring returns 401', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({
        'Set-Cookie': 'SESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
      })
    })

    const result = await getSpringSession('SESSIONID=expired')

    expect(result).toEqual({
      state: 'anonymous',
      sessionCookie: 'SESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
    })
  })

  it('returns a forbidden state when Spring returns 403', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 403
    })

    const result = await getSpringSession('SESSIONID=forbidden')

    expect(result).toEqual({ state: 'forbidden' })
  })

  it('returns unavailable when Spring returns a generic 5xx response', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: false,
      status: 502
    })

    expect(await getSpringSession('SESSIONID=upstream-error')).toEqual({ state: 'unavailable' })
  })

  it('returns a forbidden state when an authenticated user lacks admin:access', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'user-1',
        email: 'user@test.com',
        nombreUsuario: 'user',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['vacancies:read'] }
      })
    })

    expect(await getSpringSession('SESSIONID=limited')).toEqual({ state: 'forbidden' })
  })

  it('returns unavailable when Spring authentication is disabled', async () => {
    process.env.SPRING_AUTH_ENABLED = 'false'
    const { getSpringSession } = await import('../springSession')

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toEqual({ state: 'unavailable' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns unavailable when BACKEND_URL is not set', async () => {
    delete process.env.BACKEND_URL
    const { getSpringSession } = await import('../springSession')

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toEqual({ state: 'unavailable' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns unavailable when the Spring session service cannot be reached', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await getSpringSession('SESSIONID=abc123')

    expect(result).toEqual({ state: 'unavailable' })
  })

  it('returns unavailable when Spring returns a malformed session payload', async () => {
    const { getSpringSession } = await import('../springSession')

    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ userId: 'user-1' }) })

    expect(await getSpringSession('SESSIONID=malformed')).toEqual({ state: 'unavailable' })
  })
})
