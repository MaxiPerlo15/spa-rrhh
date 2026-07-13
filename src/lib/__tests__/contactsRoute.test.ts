import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const rateLimitMock = vi.fn()
const verifyTurnstileTokenMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/rateLimit', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
  rateLimit: rateLimitMock
}))

vi.mock('@/lib/botProtection', () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

describe('/api/contacts POST', () => {
  const payload = {
    name: 'Ana Perez',
    email: 'ana@example.com',
    phone: '+54 9 11 1234-5678',
    subject: 'Consulta',
    message: 'Necesito más información.',
    acceptedPrivacy: true,
    captchaToken: 'captcha-ok'
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 })
    verifyTurnstileTokenMock.mockResolvedValue({ success: true })
  })

  it('devuelve 409 cuando Spring retorna DUPLICATE_SUBMISSION', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Duplicado', code: 'DUPLICATE_SUBMISSION' }), {
        status: 409
      })
    )

    const { POST } = await import('@/app/api/contacts/route')
    const request = new NextRequest('http://localhost:3000/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toMatchObject({ code: 'DUPLICATE_SUBMISSION' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('crea el contacto proxyando a Spring cuando no hay duplicado', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'spring-contact-123',
          status: 'PENDING',
          createdAt: '2026-01-15T10:30:00Z'
        }),
        { status: 201 }
      )
    )

    const { POST } = await import('@/app/api/contacts/route')
    const request = new NextRequest('http://localhost:3000/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({ id: 'spring-contact-123', status: 'PENDING' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Ana Perez',
          email: 'ana@example.com',
          phone: '+54 9 11 1234-5678',
          subject: 'Consulta',
          message: 'Necesito más información.'
        })
      })
    )
  })

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    vi.mocked(getBackendUrl).mockReturnValueOnce(null)

    const { POST } = await import('@/app/api/contacts/route')
    const request = new NextRequest('http://localhost:3000/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(503)
  })
})

describe('/api/contacts GET', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('devuelve el listado de contactos desde Spring con campos concretos', async () => {
    authMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' }
    })

    const springContacts = [
      {
        id: 'cnt_1',
        name: 'Ana Perez',
        email: 'ana@example.com',
        phone: '+54 11 5678-1234',
        subject: 'Consulta laboral',
        message: 'Necesito info',
        status: 'PENDING',
        createdAt: '2026-01-15T10:30:00.000Z'
      },
      {
        id: 'cnt_2',
        name: 'Bob Smith',
        email: 'bob@test.com',
        phone: '555-0000',
        subject: 'Postulación espontánea',
        message: 'Interesado',
        status: 'RESPONDED',
        createdAt: '2026-02-20T14:00:00.000Z'
      }
    ]

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(springContacts), { status: 200 })
    )

    const { GET } = await import('@/app/api/contacts/route')
    const request = new NextRequest('http://localhost:3000/api/contacts')

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0]).toEqual({
      id: 'cnt_1',
      name: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+54 11 5678-1234',
      subject: 'Consulta laboral',
      message: 'Necesito info',
      status: 'PENDING',
      createdAt: '2026-01-15T10:30:00.000Z'
    })
    expect(body[1]).toEqual({
      id: 'cnt_2',
      name: 'Bob Smith',
      email: 'bob@test.com',
      phone: '555-0000',
      subject: 'Postulación espontánea',
      message: 'Interesado',
      status: 'RESPONDED',
      createdAt: '2026-02-20T14:00:00.000Z'
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/contacts',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
