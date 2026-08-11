import { describe, expect, it } from 'vitest'

import {
  getAllowedBffRequestHeaders,
  relaySpringCookies,
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
})
