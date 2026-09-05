import { afterEach, describe, expect, it, vi } from 'vitest'

const { authMock, getSpringSessionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSpringSessionMock: vi.fn()
}))

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))

import {
  getAllowedBffRequestHeaders,
  relaySpringCookies,
  authorizeDashboardRead,
  type SpringCookieSource
} from '../adminBffBoundary'

describe('adminBffBoundary', () => {
  const request = new Request('http://localhost/api/admin/resource', {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1', 'user-agent': 'Vitest' }
  })

  it('forwards only allowlisted, safe request context headers', () => {
    expect(getAllowedBffRequestHeaders(request)).toEqual({
      'X-Forwarded-For': '203.0.113.10',
      'User-Agent': 'Vitest'
    })
    expect(getAllowedBffRequestHeaders(new Request('http://localhost', {
      headers: { 'x-forwarded-for': 'not-an-ip', 'user-agent': 'x'.repeat(513) }
    }))).toEqual({})

    expect(getAllowedBffRequestHeaders(new Request('http://localhost', {
      headers: { 'x-forwarded-for': '2001:db8::10' }
    }))).toEqual({ 'X-Forwarded-For': '2001:db8::10' })

    for (const forwardedFor of ['face', '::::', '203.0.113.999', '2001:db8:::10']) {
      expect(getAllowedBffRequestHeaders(new Request('http://localhost', {
        headers: { 'x-forwarded-for': forwardedFor }
      }))).toEqual({})
    }
  })

  const headersGetCookieSource = new Headers({ 'set-cookie': 'SESSIONID=rotated; Path=/; HttpOnly' })
  Object.defineProperty(headersGetCookieSource, 'getSetCookie', { value: undefined })

  const cookieSources: [string, SpringCookieSource, readonly string[]][] = [
    ['getSetCookie', {
      get: (): string | null => null,
      getSetCookie: () => ['SESSIONID=rotated; Path=/; HttpOnly', 'XSRF=token; Path=/']
    }, ['SESSIONID=rotated', 'XSRF=token']],
    ['string', 'SESSIONID=rotated; Path=/; HttpOnly', ['SESSIONID=rotated']],
    ['string array', ['SESSIONID=rotated; Path=/; HttpOnly', 'XSRF=token; Path=/'], ['SESSIONID=rotated', 'XSRF=token']],
    ["Headers.get('set-cookie')", headersGetCookieSource, ['SESSIONID=rotated']]
  ]

  it.each(cookieSources)('appends cookies from %s without replacing response cookies', (_sourceName, source, expectedCookies) => {
    const response = new Response(null, { headers: { 'Set-Cookie': 'existing=true; Path=/' } })
    relaySpringCookies(response, source)

    const cookies = response.headers.get('set-cookie') ?? ''
    expect(cookies).toContain('existing=true')
    for (const expectedCookie of expectedCookies) expect(cookies).toContain(expectedCookie)
  })

  afterEach(() => {
    delete process.env.SPRING_AUTH_ENABLED
    vi.clearAllMocks()
  })

  it.each([
    ['anonymous', 401],
    ['forbidden', 403],
    ['unavailable', 503]
  ] as const)('does not fall back to NextAuth after Spring returns %s', async (state, status) => {
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({ state })

    await expect(authorizeDashboardRead(new Request('http://localhost', {
      headers: { Cookie: 'SESSIONID=S0; XSRF-TOKEN=csrf' }
    }))).resolves.toMatchObject({ state, status })
    expect(authMock).not.toHaveBeenCalled()
  })

  it('uses the rotated Spring session for the upstream request and relays it to the browser', async () => {
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {},
      setCookie: 'SESSIONID=S1; Path=/; HttpOnly'
    })

    await expect(authorizeDashboardRead(new Request('http://localhost', {
      headers: { Cookie: 'SESSIONID=S0; XSRF-TOKEN=csrf' }
    }))).resolves.toMatchObject({
      state: 'authorized',
      cookie: 'SESSIONID=S1; XSRF-TOKEN=csrf',
      responseCookies: 'SESSIONID=S1; Path=/; HttpOnly'
    })
  })

  it('uses legacy NextAuth only when Spring authorization is disabled', async () => {
    authMock.mockResolvedValue({ user: { role: 'ADMIN' } })

    await expect(authorizeDashboardRead(new Request('http://localhost'))).resolves.toMatchObject({
      state: 'authorized',
      cookie: ''
    })
    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })
})
