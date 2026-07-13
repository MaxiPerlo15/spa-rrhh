import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const rateLimitMock = vi.fn()
const verifyTurnstileTokenMock = vi.fn()

vi.mock('@/lib/rateLimit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimit: rateLimitMock
}))

vi.mock('@/lib/botProtection', () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock
}))

describe('/api/applications POST', () => {
  const vacancyId = 'cmc7q8v1r0000v5r4f9k0m2n3'
  const payload = {
    vacancyId,
    candidateName: 'Ana Perez',
    email: 'ana@example.com',
    phone: '+54 9 11 1234-5678',
    acceptedPrivacy: true,
    resumeUrl: 'https://utfs.io/f/cv.pdf',
    resumeFileName: 'cv.pdf',
    resumeKey: 'cv-key',
    coverLetter: 'Me interesa la vacante.',
    captchaToken: 'captcha-ok'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    delete process.env.BACKEND_URL
    delete process.env.BACKEND_INTERNAL_API_TOKEN

    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 7, retryAfterSeconds: 0 })
    verifyTurnstileTokenMock.mockResolvedValue({ success: true })
  })

  it('returns 409 when Spring detects a duplicate submission', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 409,
      json: () => Promise.resolve({
        error: 'Ya recibimos una postulación reciente para esta vacante.',
        code: 'DUPLICATE_SUBMISSION'
      })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toMatchObject({ code: 'DUPLICATE_SUBMISSION' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/applications',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    )
  })

  it('creates application via Spring and returns 201', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        id: 'app_spring_123',
        submittedAt: '2026-07-08T12:00:00Z',
        status: 'PENDING'
      })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      id: 'app_spring_123',
      status: 'PENDING'
    })
    const fetchCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(fetchCall[0]).toBe('https://spring.example.com/api/v1/applications')
    expect(fetchCall[1].method).toBe('POST')
    const sentBody = JSON.parse(fetchCall[1].body as string)
    expect(sentBody).toMatchObject({
      vacancyId,
      candidateName: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+54 9 11 1234-5678'
    })
    expect(sentBody).not.toHaveProperty('captchaToken')
    expect(sentBody).not.toHaveProperty('acceptedPrivacy')
  })

  it('returns 503 when BACKEND_URL is not configured', async () => {
    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('Spring backend not configured')
  })

  it('returns Spring error status when Spring rejects the request', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Esta vacante ya no está activa' })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Esta vacante ya no está activa')
  })

  it('returns 400 when Zod validation fails', async () => {
    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify({ candidateName: '', email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Datos inválidos')
  })

  it('returns 503 when Spring backend is unreachable (fetch throws)', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn(() => Promise.reject(new Error('fetch failed')))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('Spring backend unavailable')
  })

  it('returns 503 when Spring returns non-JSON error body', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com/'
    process.env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('Unexpected token')),
      text: () => Promise.resolve('Bad Gateway HTML')
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await import('@/app/api/applications/route')
    const request = new NextRequest('http://localhost:3000/api/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toBe('Bad Gateway HTML')
  })
})
