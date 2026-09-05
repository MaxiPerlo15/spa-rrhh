import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSpringSessionMock: vi.fn(),
  isAllowedOriginMock: vi.fn().mockReturnValue(false),
  isPublicCorsRequestMock: vi.fn().mockReturnValue(false),
  applyCorsHeadersMock: vi.fn()
}))

vi.mock('next-auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler
}))

vi.mock('next/server', () => ({
  NextResponse: {
    next: (opts?: unknown) => ({
      type: 'next',
      opts,
      headers: { append: vi.fn(), set: vi.fn() }
    }),
    json: (body: unknown, init?: unknown) => ({
      type: 'json',
      body,
      init,
      headers: { append: vi.fn(), set: vi.fn() }
    }),
    redirect: (url: string | URL) => ({
      type: 'redirect',
      url: typeof url === 'string' ? url : url.toString(),
      headers: { append: vi.fn(), set: vi.fn() }
    })
  }
}))

vi.mock('@/lib/cors', () => ({
  applyCorsHeaders: mocks.applyCorsHeadersMock,
  isAllowedOrigin: mocks.isAllowedOriginMock,
  isPublicCorsRequest: mocks.isPublicCorsRequestMock
}))

vi.mock('@/lib/springSession', () => ({
  getSpringSession: mocks.getSpringSessionMock
}))

import { proxy } from '@/proxy'

function makeRequest(pathname: string, opts: { cookie?: string; origin?: string; host?: string; method?: string } = {}) {
  const headers = new Headers()
  if (opts.cookie) headers.set('cookie', opts.cookie)
  if (opts.origin) headers.set('origin', opts.origin)
  if (opts.host) headers.set('host', opts.host)

  return {
    nextUrl: { pathname, origin: 'http://localhost:3001' },
    headers,
    url: `http://localhost:3001${pathname}`,
    method: opts.method || 'GET'
  } as never
}

describe('proxy — CORS and cross-origin branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'false'
    mocks.isAllowedOriginMock.mockReturnValue(false)
    mocks.isPublicCorsRequestMock.mockReturnValue(false)
  })

  it('returns 403 for cross-origin request with disallowed origin', () => {
    const request = makeRequest('/api/vacancies', { origin: 'https://evil.com' })
    const result = proxy(request, {} as never) as unknown as { type: string; body: { error: string } }
    expect(result.type).toBe('json')
    expect(result.body).toMatchObject({ error: 'Origen no permitido' })
  })

  it('returns 403 for cross-origin request to non-public CORS route', () => {
    mocks.isAllowedOriginMock.mockReturnValue(true)
    mocks.isPublicCorsRequestMock.mockReturnValue(false)
    const request = makeRequest('/api/admin/users', { origin: 'https://allowed.com' })
    const result = proxy(request, {} as never) as unknown as { type: string; body: { error: string } }
    expect(result.type).toBe('json')
    expect(result.body).toMatchObject({ error: 'Cross-origin access not allowed' })
  })

  it('applies CORS headers for cross-origin GET to public route', () => {
    mocks.isAllowedOriginMock.mockReturnValue(true)
    mocks.isPublicCorsRequestMock.mockReturnValue(true)
    const request = makeRequest('/api/vacancies', { origin: 'https://allowed.com' })
    proxy(request, {} as never)
    expect(mocks.applyCorsHeadersMock).toHaveBeenCalled()
  })

  it('does not apply CORS headers for same-origin request', () => {
    const request = makeRequest('/api/vacancies')
    proxy(request, {} as never)
    expect(mocks.applyCorsHeadersMock).not.toHaveBeenCalled()
  })

  it('treats a request origin matching the Host header as same-origin', () => {
    const request = makeRequest('/api/auth/spring/login', {
      origin: 'http://127.0.0.1:3100',
      host: '127.0.0.1:3100',
      method: 'POST'
    })

    const result = proxy(request, {} as never) as unknown as { type: string }

    expect(result.type).toBe('next')
    expect(mocks.isAllowedOriginMock).not.toHaveBeenCalled()
  })
})

describe('proxy — Spring session branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'true'
  })

  it('redirects to /admin/signin when no SESSIONID cookie', async () => {
    const request = makeRequest('/admin/dashboard')
    const result = await proxy(request, {} as never) as unknown as { type: string; url: string }
    expect(result.type).toBe('redirect')
    expect(result.url).toContain('/admin/signin')
  })

  it('redirects to /admin/signin when Spring session is anonymous', async () => {
    mocks.getSpringSessionMock.mockResolvedValue({ state: 'anonymous' })
    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=abc123' })
    const result = await proxy(request, {} as never) as unknown as { type: string; url: string }
    expect(result.type).toBe('redirect')
    expect(result.url).toContain('/admin/signin')
  })

  it('passes an authorized browser session through with its CSP and SESSIONID forwarding intact', async () => {
    mocks.getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
      }
    })
    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=abc123' })
    const result = await proxy(request, {} as never) as unknown as {
      type: string
      opts: { request: { headers: Headers } }
      headers: { set: ReturnType<typeof vi.fn> }
    }

    expect(result.type).toBe('next')
    expect(mocks.getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=abc123')
    expect(result.opts.request.headers.get('cookie')).toBe('SESSIONID=abc123')
    expect(result.opts.request.headers.get('x-nonce')).toEqual(expect.any(String))
    expect(result.headers.set).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String))
  })

  it('forwards a rotated Spring SESSIONID on the authorized response', async () => {
    const rotatedCookie = 'SESSIONID=rotated-456; Path=/; HttpOnly; SameSite=Lax'
    mocks.getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
      },
      setCookie: rotatedCookie
    })

    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=original-123' })
    const result = await proxy(request, {} as never) as unknown as {
      type: string
       headers: { append: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }
    }

    expect(result.type).toBe('next')
    expect(result.headers.append).toHaveBeenCalledWith('Set-Cookie', rotatedCookie)
  })

  it('forwards Spring expiry when an anonymous session redirects to signin', async () => {
    const expiredCookie = 'SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
    mocks.getSpringSessionMock.mockResolvedValue({
      state: 'anonymous',
      setCookie: expiredCookie
    })

    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=expired' })
    const result = await proxy(request, {} as never) as unknown as {
      type: string
      url: string
       headers: { append: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }
    }

    expect(result.type).toBe('redirect')
    expect(result.url).toContain('/admin/signin')
    expect(result.headers.append).toHaveBeenCalledWith('Set-Cookie', expiredCookie)
  })

  it('returns 403 when Spring identifies an authenticated non-admin', async () => {
    mocks.getSpringSessionMock.mockResolvedValue({ state: 'forbidden' })
    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=limited' })
    const result = await proxy(request, {} as never) as unknown as { type: string; init: { status: number } }

    expect(result.type).toBe('json')
    expect(result.init).toEqual({ status: 403 })
  })

  it('returns 503 instead of redirecting when Spring session validation is unavailable', async () => {
    mocks.getSpringSessionMock.mockResolvedValue({ state: 'unavailable' })
    const request = makeRequest('/admin/dashboard', { cookie: 'SESSIONID=abc123' })
    const result = await proxy(request, {} as never) as unknown as { type: string; init: { status: number } }

    expect(result.type).toBe('json')
    expect(result.init).toEqual({ status: 503 })
  })
})

describe('proxy — CSP nonce and public admin paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'false'
  })

  it('adds CSP nonce for non-admin, non-API paths', () => {
    const request = makeRequest('/vacancies')
    const result = proxy(request, {} as never) as unknown as { type: string; headers: { set: ReturnType<typeof vi.fn> } }
    expect(result.type).toBe('next')
    expect(result.headers.set).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String))
  })

  it('allows public admin paths without session check', () => {
    const request = makeRequest('/admin/signin')
    const result = proxy(request, {} as never) as unknown as { type: string }
    expect(result.type).toBe('next')
    expect(mocks.getSpringSessionMock).not.toHaveBeenCalled()
  })
})
