import { describe, expect, it, vi, beforeEach } from 'vitest'

const { getSpringSessionMock } = vi.hoisted(() => ({
  getSpringSessionMock: vi.fn()
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
    redirect: (url: string) => ({
      type: 'redirect',
      url,
      headers: { append: vi.fn(), set: vi.fn() }
    })
  }
}))

vi.mock('@/lib/cors', () => ({
  applyCorsHeaders: vi.fn(),
  isAllowedOrigin: vi.fn().mockReturnValue(false),
  isPublicCorsRequest: vi.fn().mockReturnValue(false)
}))

vi.mock('@/lib/springSession', () => ({
  getSpringSession: getSpringSessionMock
}))

import { proxy } from '@/proxy'

function makeRequest(pathname: string, cookieHeader = '') {
  const headers = new Headers()
  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }

  return {
    nextUrl: { pathname, origin: 'http://localhost:3001' },
    headers,
    url: `http://localhost:3001${pathname}`
  } as never
}

describe('proxy — Spring session relay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SPRING_AUTH_ENABLED = 'true'
    process.env.BACKEND_URL = 'https://spring.example.com'
  })

  it('allows /admin/signin without session check', () => {
    const request = makeRequest('/admin/signin')
    proxy(request, {} as never)

    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })

  it('forwards SESSIONID cookie to Spring for /admin paths', () => {
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: {
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
      }
    })

    const request = makeRequest('/admin/dashboard', 'SESSIONID=abc123')
    proxy(request, {} as never)

    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=abc123')
  })

  it('expires a stale SESSIONID when Spring rejects it during the proxy check', async () => {
    getSpringSessionMock.mockResolvedValue({
      state: 'anonymous',
      sessionCookie: 'SESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
    })

    const response = await proxy(makeRequest('/admin', 'SESSIONID=expired') as never, {} as never)

    expect(response).toBeDefined()
    expect(response!.headers.append).toHaveBeenCalledWith(
      'Set-Cookie',
      'SESSIONID=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
    )
  })

  it('forwards a rotated SESSIONID after Spring validates the admin session', async () => {
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      sessionCookie: 'SESSIONID=rotated; Path=/; HttpOnly; SameSite=Lax',
      user: {
        userId: 'user-1',
        email: 'admin@test.com',
        nombreUsuario: 'admin',
        rol: { id: 'rol-1', nombre: 'ADMIN', permisos: ['admin:access'] }
      }
    })

    const response = await proxy(makeRequest('/admin', 'SESSIONID=stale-id') as never, {} as never)

    expect(response).toBeDefined()
    expect(response!.headers.append).toHaveBeenCalledWith(
      'Set-Cookie',
      'SESSIONID=rotated; Path=/; HttpOnly; SameSite=Lax'
    )
  })

  it('does not check session for non-admin paths', () => {
    const request = makeRequest('/vacancies')
    proxy(request, {} as never)

    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })

  it('does not check session for API paths', () => {
    const request = makeRequest('/api/vacancies')
    proxy(request, {} as never)

    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })

  it('passes through public admin paths without session', () => {
    const request = makeRequest('/admin/forgot-password')
    proxy(request, {} as never)

    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })
})
