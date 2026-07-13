import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const vacancyCreateMock = vi.fn()
const auditAdminActionMock = vi.fn()
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

vi.mock('@/lib/adminAudit', () => ({
  auditAdminAction: auditAdminActionMock
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
    authMock.mockResolvedValue({
      user: {
        id: 'usr_admin',
        role: 'ADMIN'
      }
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
})
