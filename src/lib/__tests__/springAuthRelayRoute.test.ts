import { beforeEach, describe, expect, it, vi } from 'vitest'

const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))

describe('Spring authentication relays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
  })

  it('forwards a successful same-origin login and Spring session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: 'u1', email: 'admin@example.com' }), {
        status: 200,
        headers: { 'Set-Cookie': 'SESSIONID=spring-session; Path=/; HttpOnly; SameSite=Lax' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/auth/spring/login/route')
    const response = await POST(
      new Request('http://next.example.com/api/auth/spring/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'not-exposed' })
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: 'u1', email: 'admin@example.com' })
    expect(response.headers.get('Set-Cookie')).toContain('SESSIONID=spring-session')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Api-Key': 'test-token'
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'not-exposed' }),
      cache: 'no-store',
      credentials: 'omit'
    })
  })

  it('maps rejected Spring credentials without relaying Spring error details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'internal Spring detail' }), { status: 401 }))
    )

    const { POST } = await import('@/app/api/auth/spring/login/route')
    const response = await POST(
      new Request('http://next.example.com/api/auth/spring/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'wrong' })
      })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'invalid_credentials' })
  })

  it('forwards the browser session to Spring logout and relays its clearing cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': 'SESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/auth/spring/logout/route')
    const response = await POST(
      new Request('http://next.example.com/api/auth/spring/logout', {
        method: 'POST',
        headers: { Cookie: 'other=value; SESSIONID=spring-session' }
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Set-Cookie')).toContain('SESSIONID=; Max-Age=0')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: 'other=value; SESSIONID=spring-session',
        'X-Backend-Api-Key': 'test-token'
      },
      cache: 'no-store',
      credentials: 'omit'
    })
  })

  it('maps an unavailable Spring backend without exposing credentials or backend errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))

    const { POST } = await import('@/app/api/auth/spring/login/route')
    const response = await POST(
      new Request('http://next.example.com/api/auth/spring/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'not-exposed' })
      })
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'spring_auth_unavailable' })
  })
})
