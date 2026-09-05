import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))

const responseCookies = (response: Response) =>
  (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()

describe('Spring logout route cookie contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'relay-token' })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('preserves every upstream cookie and expires the Next-origin session on 204', async () => {
    const upstreamCookies = [
      'SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
      'SPRING-XSRF=; Path=/; Max-Age=0'
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 204,
      headers: { get: () => null, getSetCookie: () => upstreamCookies }
    }))

    const { POST } = await import('@/app/api/auth/spring/logout/route')
    const response = await POST(new Request('http://localhost/api/auth/spring/logout', { method: 'POST' }))

    expect(response.status).toBe(204)
    expect(responseCookies(response)).toEqual([
      ...upstreamCookies,
      'SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    ])
  })

  it('adds Secure to the Next-origin expiry in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 204,
      headers: { get: () => null, getSetCookie: () => ['spring-cookie=value; Path=/'] }
    }))

    const { POST } = await import('@/app/api/auth/spring/logout/route')
    const response = await POST(new Request('http://localhost/api/auth/spring/logout', { method: 'POST' }))

    expect(responseCookies(response)).toEqual([
      'spring-cookie=value; Path=/',
      'SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure'
    ])
  })

  it('does not add local expiry when Spring logout is not successful', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      headers: { get: () => null, getSetCookie: () => ['SESSIONID=; Path=/; Max-Age=0; HttpOnly'] }
    }))

    const { POST } = await import('@/app/api/auth/spring/logout/route')
    const response = await POST(new Request('http://localhost/api/auth/spring/logout', { method: 'POST' }))

    expect(response.status).toBe(401)
    expect(responseCookies(response)).toEqual(['SESSIONID=; Path=/; Max-Age=0; HttpOnly'])
  })
})
