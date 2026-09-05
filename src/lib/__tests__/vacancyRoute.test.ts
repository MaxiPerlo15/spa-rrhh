import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const vacancyCreateMock = vi.fn()
const getSpringSessionMock = vi.fn()
const ORIGINAL_ENV = process.env

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vacancy: {
      create: vacancyCreateMock,
      findMany: vi.fn()
    }
  }
}))

vi.mock('@/lib/springSession', () => ({
  getSpringSession: getSpringSessionMock
}))

vi.mock('@/lib/server/publicVacancies', () => ({
  revalidatePublicVacanciesCache: vi.fn()
}))

describe('/api/vacancies', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.BACKEND_URL
    delete process.env.BACKEND_INTERNAL_API_TOKEN
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('preserves Spring validation status and message when creation is rejected', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: {}
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: 'modalidad is invalid' }))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/vacancies/route')
    const request = new NextRequest('http://localhost:3000/api/vacancies', {
      method: 'POST',
      headers: { Cookie: 'SESSIONID=spring-admin-session' },
      body: JSON.stringify({
        title: 'Backend Engineer',
        description: 'Build APIs',
        location: 'Remote',
        workday: 'FULL_TIME',
        modality: 'REMOTE'
      })
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('modalidad is invalid')
    expect(vacancyCreateMock).not.toHaveBeenCalled()
  })

  it('returns 503 when BACKEND_URL is not configured for POST', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })

    const { POST } = await import('@/app/api/vacancies/route')
    const request = new NextRequest('http://localhost:3000/api/vacancies', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Backend Engineer',
        description: 'Build APIs',
        location: 'Remote',
        workday: 'FULL_TIME',
        modality: 'REMOTE'
      })
    })
    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe('Vacancy backend not configured')
    expect(vacancyCreateMock).not.toHaveBeenCalled()
  })

  it('returns 503 when BACKEND_URL is not configured for GET', async () => {
    authMock.mockResolvedValue(null)

    const { GET } = await import('@/app/api/vacancies/route')
    const request = new NextRequest('http://localhost:3000/api/vacancies')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe('Vacancy backend not configured')
  })

  it('relays an authorized creation to Spring with safe request context', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { getSetCookie: () => ['SESSIONID=rotated-session; Path=/; HttpOnly; SameSite=Lax'] },
      json: () => Promise.resolve({
        id: 'vacancy-1',
        titulo: 'Backend Engineer',
        descripcion: 'Build APIs',
        requisitos: null,
        ubicacionNombre: 'Remote',
        ubicacionDescripcion: 'Remote',
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'CREATED',
        fechaCreacion: '2026-07-22T00:00:00.000Z',
        fechaPublicacion: null
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/vacancies/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/vacancies', {
      method: 'POST',
      headers: {
        Cookie: 'SESSIONID=spring-admin-session',
        'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
        'User-Agent': 'browser-agent'
      },
      body: JSON.stringify({
        title: 'Backend Engineer',
        description: 'Build APIs',
        location: 'Remote',
        workday: 'FULL_TIME',
        modality: 'REMOTE'
      })
    }))

    expect(response.status).toBe(201)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated-session')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/vacancies',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'X-Backend-Api-Key': 'shared-secret',
          Cookie: 'SESSIONID=spring-admin-session',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'browser-agent'
        }
      })
    )
  })

  it.each([
    [401, { error: 'unauthorized', source: 'spring' }, ['SESSIONID=expired; Max-Age=0; Path=/; HttpOnly']],
    [403, { error: 'forbidden', source: 'spring' }, ['SESSIONID=rotated; Path=/; HttpOnly', 'XSRF-TOKEN=token; Path=/']]
  ])('relays Spring POST denial %i exactly without local session authorization', async (status, body, setCookies) => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    getSpringSessionMock.mockRejectedValue(new Error('BFF preflight must not run'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      headers: {
        get: (name: string) => name === 'content-type' ? 'application/json' : null,
        getSetCookie: () => setCookies
      },
      text: () => Promise.resolve(JSON.stringify(body))
    }))

    const { POST } = await import('@/app/api/vacancies/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/vacancies', {
      method: 'POST',
      headers: {
        Cookie: 'SESSIONID=browser-session; XSRF-TOKEN=csrf',
        'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
        'User-Agent': 'vacancy-post-test',
        Authorization: 'Bearer do-not-forward'
      },
      body: JSON.stringify({
        title: 'Backend Engineer',
        description: 'Build APIs',
        location: 'Remote',
        workday: 'FULL_TIME',
        modality: 'REMOTE'
      })
    }))

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual(body)
    expect(getSpringSessionMock).not.toHaveBeenCalled()
    expect((response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()).toEqual(setCookies)
    expect(fetch).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/vacancies',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'SESSIONID=browser-session; XSRF-TOKEN=csrf',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'vacancy-post-test'
        })
      })
    )
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).not.toHaveProperty('Authorization')
  })

  it('relays a rotated cookie when Spring returns an unexpected error', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { getSetCookie: () => ['SESSIONID=rotated; Path=/; HttpOnly'] },
      text: () => Promise.resolve('failure')
    }))
    const { POST } = await import('@/app/api/vacancies/route')
    const response = await POST(new NextRequest('http://localhost:3000/api/vacancies', {
      method: 'POST', headers: { Cookie: 'SESSIONID=active' }, body: JSON.stringify({ title: 'Role', description: 'Description', location: 'Remote', workday: 'FULL_TIME', modality: 'REMOTE' })
    }))

    expect(response.status).toBe(500)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated')
  })

  it('uses and relays the rotated Spring session only for protected all=true reads', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', user: {}, setCookie: 'SESSIONID=S1; Path=/; HttpOnly' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { getSetCookie: () => ['XSRF-TOKEN=next; Path=/'] },
      json: () => Promise.resolve([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/vacancies/route')
    const protectedResponse = await GET(new NextRequest('http://localhost/api/vacancies?all=true', {
      headers: { Cookie: 'SESSIONID=S0; XSRF-TOKEN=csrf' }
    }))
    const publicResponse = await GET(new NextRequest('http://localhost/api/vacancies'))

    expect(protectedResponse.status).toBe(200)
    expect(protectedResponse.headers.get('set-cookie')).toContain('SESSIONID=S1')
    expect(protectedResponse.headers.get('set-cookie')).toContain('XSRF-TOKEN=next')
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://spring.example.com/api/v1/vacancies?all=true', expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'SESSIONID=S1; XSRF-TOKEN=csrf' }) }))
    expect(publicResponse.status).toBe(200)
    expect(getSpringSessionMock).toHaveBeenCalledTimes(1)
  })

  it('preserves the public vacancy failure envelope when Spring rejects a public read', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('Bad Gateway')
    }))

    const { GET } = await import('@/app/api/vacancies/route')
    const response = await GET(new NextRequest('http://localhost/api/vacancies'))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Error al obtener vacantes' })
    expect(getSpringSessionMock).not.toHaveBeenCalled()
  })

  it.each([['anonymous', 401], ['forbidden', 403], ['unavailable', 503]] as const)(
    'preserves Spring %s without a legacy fallback for protected reads', async (state, status) => {
      process.env.BACKEND_URL = 'https://spring.example.com/'
      process.env.SPRING_AUTH_ENABLED = 'true'
      getSpringSessionMock.mockResolvedValue({ state })
      const { GET } = await import('@/app/api/vacancies/route')
      const response = await GET(new NextRequest('http://localhost/api/vacancies?all=true'))
      expect(response.status).toBe(status)
      if (state === 'unavailable') {
        await expect(response.json()).resolves.toEqual({ error: 'Spring backend unavailable' })
      }
      expect(authMock).not.toHaveBeenCalled()
    }
  )
})
