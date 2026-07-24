import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { auditAdminActionMock } = vi.hoisted(() => ({ auditAdminActionMock: vi.fn() }))

vi.mock('@/lib/adminAudit', () => ({ auditAdminAction: auditAdminActionMock }))

import {
  getAllowedBffRequestHeaders,
  recordDeniedBffAudit,
  recordErrorBffAudit,
  relaySpringCookies,
  type SpringCookieSource
} from '../adminBffBoundary'

describe('adminBffBoundary', () => {
  const request = new NextRequest('http://localhost/api/admin/resource', {
    headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1', 'user-agent': 'Vitest' }
  })
  const event = { action: 'vacancy.update', resourceType: 'vacancy', resourceId: 'vacancy-1' }

  it('records denied and error outcomes with request context', async () => {
    await recordDeniedBffAudit(request, event)
    await recordErrorBffAudit(request, { ...event, metadata: { source: 'bff' } }, new Error('offline'))

    expect(auditAdminActionMock).toHaveBeenNthCalledWith(1, { ...event, request, outcome: 'DENIED' })
    expect(auditAdminActionMock).toHaveBeenNthCalledWith(2, {
      ...event,
      request,
      outcome: 'ERROR',
      metadata: { source: 'bff', error: 'offline' }
    })
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
