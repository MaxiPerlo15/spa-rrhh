import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const findFirstMock = vi.fn()
const findUniqueMock = vi.fn()
const updateMock = vi.fn()
const auditAdminActionMock = vi.fn()
const getSpringSessionMock = vi.fn()
const ORIGINAL_ENV = process.env

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vacancy: {
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
      update: updateMock
    }
  }
}))

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: auditAdminActionMock
}))

vi.mock('@/lib/springSession', () => ({
  getSpringSession: getSpringSessionMock
}))

vi.mock('@/lib/server/publicVacancies', () => ({
  revalidatePublicVacanciesCache: vi.fn()
}))

describe('/api/vacancies/[id]', () => {
  const vacancyId = 'cmc7q8v1r0000v5r4f9k0m2n3'

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

  it('returns 503 when BACKEND_URL is not configured for GET', async () => {
    authMock.mockResolvedValue(null)

    const { GET } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`)
    const response = await GET(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe('Vacancy backend not configured')
    expect(findFirstMock).not.toHaveBeenCalled()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 503 when BACKEND_URL is not configured for DELETE', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })

    const { DELETE } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response!.json()

    expect(response!.status).toBe(503)
    expect(payload.error).toBe('Vacancy backend not configured')
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns 503 when BACKEND_URL is not configured for PATCH', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated Engineer' })
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response!.json()

    expect(response!.status).toBe(503)
    expect(payload.error).toBe('Vacancy backend not configured')
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('queries Spring with the internal token and normalizes CREATED as draft', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: vacancyId,
        titulo: 'Backend Engineer',
        descripcion: 'Desc',
        requisitos: null,
        ubicacionNombre: 'Cordoba',
        ubicacionDescripcion: 'Cordoba',
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'CREATED',
        fechaCreacion: '2026-03-01T00:00:00.000Z',
        fechaPublicacion: null
      })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`)
    const response = await GET(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('draft')
    expect(fetchMock).toHaveBeenCalledWith(
      `https://spring.example.com/api/v1/vacancies/${vacancyId}`,
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-Backend-Api-Key': 'shared-secret' }
      })
    )
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('does not fall back to Prisma when Spring is configured and returns 404', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue(null)
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('not found')
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`)
    const response = await GET(request, { params: Promise.resolve({ id: vacancyId }) })

    expect(response.status).toBe(404)
    expect(findFirstMock).not.toHaveBeenCalled()
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('returns 404 when Spring close reports the vacancy is missing', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('not found')
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { DELETE } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: vacancyId }) })

    expect(response!.status).toBe(404)
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns a business-rule response when Spring rejects closing an already closed vacancy', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ message: 'Vacancy is already closed' }))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { DELETE } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response!.json()

    expect(response!.status).toBe(409)
    expect(payload.error).toBe('Vacancy is already closed')
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns a business-rule response when Spring rejects activation', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ error: 'La vacante no puede activarse' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' })
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('La vacante no puede activarse')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns 404 when Spring reports the vacancy disappeared during deactivation', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('not found')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'INACTIVE' })
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: vacancyId }) })

    expect(response.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rejects salary and benefits updates for Spring-backed vacancies', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ salary: '1000', benefits: 'Health insurance' })
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('salary')
    expect(payload.error).toContain('benefits')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves Spring status and message when a data update is rejected', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
    })
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      user: { userId: 'spring-admin', email: 'admin@example.com' }
    })
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ message: 'title already exists' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const request = new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      headers: { Cookie: 'SESSIONID=spring-admin-session' },
      body: JSON.stringify({ title: 'Backend Engineer' })
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: vacancyId }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('title already exists')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('forwards only safe context and the rotated Spring session, then appends both response cookies', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({ user: { id: 'usr_admin', role: 'ADMIN' } })
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: { userId: 'spring-admin', email: 'admin@example.com' }
    })
    const mutationCookie = 'XSRF-TOKEN=mutation-token; Path=/; SameSite=Lax'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => name === 'set-cookie' ? mutationCookie : null,
        getSetCookie: () => [mutationCookie]
      },
      json: () => Promise.resolve({
        id: vacancyId,
        titulo: 'Updated Engineer',
        descripcion: 'Desc',
        requisitos: null,
        ubicacionNombre: 'Cordoba',
        ubicacionDescripcion: 'Cordoba',
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'ACTIVE',
        fechaCreacion: '2026-03-01T00:00:00.000Z',
        fechaPublicacion: '2026-03-02T00:00:00.000Z'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { PATCH } = await import('@/app/api/vacancies/[id]/route')
    const response = await PATCH(new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PATCH',
      headers: {
        Cookie: 'SESSIONID=original-session',
        'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
        'User-Agent': 'Vitest',
        Authorization: 'Bearer do-not-forward'
      },
      body: JSON.stringify({ title: 'Updated Engineer' })
    }), { params: Promise.resolve({ id: vacancyId }) })

    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=original-session')
    expect(fetchMock).toHaveBeenCalledWith(
      `https://spring.example.com/api/v1/vacancies/${vacancyId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Backend-Api-Key': 'shared-secret',
          Cookie: 'SESSIONID=rotated-session',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'Vitest'
        })
      })
    )
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated-session')
    expect(response.headers.get('set-cookie')).toContain('XSRF-TOKEN=mutation-token')
  })

  it('forwards only safe context and the rotated Spring session for PUT, then appends both response cookies', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    authMock.mockResolvedValue({ user: { id: 'usr_admin', role: 'ADMIN' } })
    getSpringSessionMock.mockResolvedValue({
      state: 'authorized',
      setCookie: 'SESSIONID=rotated-session; Path=/; HttpOnly',
      user: { userId: 'spring-admin', email: 'admin@example.com' }
    })
    const mutationCookie = 'XSRF-TOKEN=mutation-token; Path=/; SameSite=Lax'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => name === 'set-cookie' ? mutationCookie : null,
        getSetCookie: () => [mutationCookie]
      },
      json: () => Promise.resolve({
        id: vacancyId,
        titulo: 'Updated Engineer',
        descripcion: 'Desc',
        requisitos: null,
        ubicacionNombre: 'Cordoba',
        ubicacionDescripcion: 'Cordoba',
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'ACTIVE',
        fechaCreacion: '2026-03-01T00:00:00.000Z',
        fechaPublicacion: '2026-03-02T00:00:00.000Z'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { PUT } = await import('@/app/api/vacancies/[id]/route')
    const response = await PUT(new NextRequest(`http://localhost:3000/api/vacancies/${vacancyId}`, {
      method: 'PUT',
      headers: {
        Cookie: 'SESSIONID=original-session',
        'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
        'User-Agent': 'Vitest',
        Authorization: 'Bearer do-not-forward'
      },
      body: JSON.stringify({ title: 'Updated Engineer' })
    }), { params: Promise.resolve({ id: vacancyId }) })

    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=original-session')
    expect(fetchMock).toHaveBeenCalledWith(
      `https://spring.example.com/api/v1/vacancies/${vacancyId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Backend-Api-Key': 'shared-secret',
          Cookie: 'SESSIONID=rotated-session',
          'X-Forwarded-For': '203.0.113.10',
          'User-Agent': 'Vitest'
        })
      })
    )
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
    expect(response.headers.get('set-cookie')).toContain('SESSIONID=rotated-session')
    expect(response.headers.get('set-cookie')).toContain('XSRF-TOKEN=mutation-token')
  })
})
