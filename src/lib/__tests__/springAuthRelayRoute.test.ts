import { beforeEach, describe, expect, it, vi } from 'vitest'

const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))

describe('Spring auth relays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'relay-token' })
  })

  it('relays login credentials to Spring, forwards its session cookie, and redacts an upstream error body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: 'do-not-expose' }), {
        status: 401,
        headers: { 'Set-Cookie': 'SESSIONID=expired; Path=/; HttpOnly' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/auth/spring/login/route')
    const response = await POST(
      new Request('http://localhost/api/auth/spring/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@example.com', password: 'Password123!' })
      })
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('Set-Cookie')).toContain('SESSIONID=expired')
    await expect(response.json()).resolves.toEqual({ error: 'Invalid credentials' })
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Api-Key': 'relay-token'
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'Password123!' }),
      cache: 'no-store'
    })
  })

  it('relays logout with the browser session cookie and forwards Spring cookie clearing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        headers: { 'Set-Cookie': 'SESSIONID=; Path=/; Max-Age=0; HttpOnly' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/auth/spring/logout/route')
    const response = await POST(
      new Request('http://localhost/api/auth/spring/logout', {
        method: 'POST',
        headers: { Cookie: 'SESSIONID=active-session; other=value' }
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: 'SESSIONID=active-session; other=value',
        'X-Backend-Api-Key': 'relay-token'
      },
      cache: 'no-store'
    })
  })

  it('returns the successful Spring login body with its session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: 'admin-1', email: 'admin@example.com' }), {
        status: 200,
        headers: { 'Set-Cookie': 'SESSIONID=active-session; Path=/; HttpOnly' }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/auth/spring/login/route')
    const response = await POST(
      new Request('http://localhost/api/auth/spring/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@example.com', password: 'Password123!' })
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toContain('SESSIONID=active-session')
    await expect(response.json()).resolves.toEqual({ userId: 'admin-1', email: 'admin@example.com' })
  })
})
