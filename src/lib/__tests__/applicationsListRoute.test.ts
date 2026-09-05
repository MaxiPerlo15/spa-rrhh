import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, getSpringSessionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getSpringSessionMock: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))
vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))

describe('/api/applications GET', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    delete process.env.BACKEND_URL
    delete process.env.BACKEND_INTERNAL_API_TOKEN
  })

  it('rechaza acceso sin autenticación de admin', async () => {
    authMock.mockResolvedValue(null)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: 'No autorizado' })
  })

  it('devuelve el listado de postulaciones desde Spring', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([
        {
          id: 'app_1',
          candidateId: 'cand_1',
          candidateName: 'Ana Perez',
          email: 'ana@example.com',
          phone: '+54 9 11 1234-5678',
          resumeUrl: 'https://utfs.io/f/cv.pdf',
          resumeFileName: 'cv.pdf',
          coverLetter: 'Experiencia en reclutamiento.',
          status: 'PENDING',
          submittedAt: '2026-03-10T12:00:00Z',
          vacancy: {
            id: 'vac_1',
            title: 'Analista RRHH',
            location: 'Cordoba'
          }
        },
        {
          id: 'app_2',
          candidateId: 'cand_2',
          candidateName: 'Carlos Diaz',
          email: 'carlos@example.com',
          phone: '+54 9 351 555-5555',
          resumeUrl: null,
          resumeFileName: null,
          coverLetter: null,
          status: 'REVIEWING',
          submittedAt: '2026-03-11T12:00:00Z',
          vacancy: null
        }
      ])
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({
      id: 'app_1',
      candidateName: 'Ana Perez',
      email: 'ana@example.com',
      status: 'PENDING',
      vacancy: {
        id: 'vac_1',
        title: 'Analista RRHH',
        location: 'Cordoba'
      }
    })
    expect(body[1]).toMatchObject({
      id: 'app_2',
      candidateName: 'Carlos Diaz',
      email: 'carlos@example.com',
      status: 'REVIEWING'
    })
    // toApplicationAdminDto maps null vacancy to undefined
    expect(body[1].vacancy).toBeUndefined()
  })

  it('devuelve lista vacía cuando Spring retorna array vacío', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([])
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 503 when BACKEND_URL is not configured', async () => {
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('Spring backend not configured')
  })

  it('returns Spring error status when Spring rejects the request', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Forbidden' }),
      text: () => Promise.resolve('Forbidden')
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('Forbidden')
  })

  it('passes query params to Spring', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([])
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    // Use a valid cuid-format ID for the vacancyId query param
    const request = new NextRequest('http://localhost:3000/api/applications?vacancyId=cmc7q8v1r0000v5r4f9k0m2n3&status=PENDING')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/applications?vacancyId=cmc7q8v1r0000v5r4f9k0m2n3&status=PENDING',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-Backend-Api-Key': 'shared-secret' })
      })
    )
  })

  it('returns 503 when Spring backend is unreachable (fetch throws)', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.reject(new Error('fetch failed')))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('Spring backend unavailable')
  })

  it('returns503 when Spring error response body cannot be parsed as JSON', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: { id: 'usr_admin', role: 'ADMIN' }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('Unexpected token')),
      text: () => Promise.resolve('Bad Gateway HTML')
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toBe('Bad Gateway HTML')
  })

  it('forwards S1 to Spring and appends validation and upstream cookies', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', user: {}, setCookie: 'SESSIONID=S1; Path=/; HttpOnly' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { getSetCookie: () => ['XSRF-TOKEN=next; Path=/'] },
      json: () => Promise.resolve([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/applications/route')
    const response = await GET(new NextRequest('http://localhost/api/applications', {
      headers: { Cookie: 'SESSIONID=S0' }
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=S1')
    expect(response.headers.get('set-cookie')).toContain('XSRF-TOKEN=next')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/applications', expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'SESSIONID=S1' }) }))
  })

  it('retains S1 when local query validation rejects after Spring authorization', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', user: {}, setCookie: 'SESSIONID=S1; Path=/; HttpOnly' })

    const { GET } = await import('@/app/api/applications/route')
    const response = await GET(new NextRequest('http://localhost/api/applications?status=INVALID'))

    expect(response.status).toBe(400)
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=S1')
  })

  it('retains S1 when the backend is missing after Spring authorization', async () => {
    process.env.SPRING_AUTH_ENABLED = 'true'
    getSpringSessionMock.mockResolvedValue({ state: 'authorized', user: {}, setCookie: 'SESSIONID=S1; Path=/; HttpOnly' })

    const { GET } = await import('@/app/api/applications/route')
    const response = await GET(new NextRequest('http://localhost/api/applications'))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Spring backend not configured' })
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=S1')
  })

  it.each([['anonymous', 401], ['forbidden', 403], ['unavailable', 503]] as const)(
    'returns Spring %s without calling legacy NextAuth', async (state, status) => {
      process.env.BACKEND_URL = 'https://spring.example.com/'
      process.env.SPRING_AUTH_ENABLED = 'true'
      getSpringSessionMock.mockResolvedValue({ state })
      const { GET } = await import('@/app/api/applications/route')
      const response = await GET(new NextRequest('http://localhost/api/applications'))
      expect(response.status).toBe(status)
      if (state === 'unavailable') {
        await expect(response.json()).resolves.toEqual({ error: 'Spring backend unavailable' })
      }
      expect(authMock).not.toHaveBeenCalled()
    }
  )
})
