import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { auth, session, backend, headers, fetchMock } = vi.hoisted(() => ({
  auth: vi.fn(), session: vi.fn(), backend: vi.fn(), headers: vi.fn(), fetchMock: vi.fn()
}))
const authorized = { state: 'authorized', user: {
  userId: 'admin-1', email: 'admin@example.com', nombreUsuario: 'Admin',
  rol: { id: 'role-1', nombre: 'Admin', permisos: ['admin:access'] }
} }
const application = {
  id: 'app-1', candidateId: 'candidate-1', candidateName: 'Ana; Pérez',
  email: 'ana@empresa.com', phone: '+54 9 351 1111111', status: 'PENDING',
  submittedAt: '2026-03-04T12:00:00.000Z', vacancy: { id: 'vacancy-1', title: 'Diseñadora UX', location: 'Buenos Aires' }
}

vi.mock('@/lib/auth', () => ({ auth }))
vi.mock('@/lib/springSession', () => ({ getSpringSession: session }))
vi.mock('@/lib/prisma', () => { throw new Error('Applications export must not contact Prisma') })
vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: backend, getSpringBackendHeaders: headers,
  isSpringAuthEnabled: vi.fn(() => process.env.SPRING_AUTH_ENABLED === 'true')
}))
vi.stubGlobal('fetch', fetchMock)

const request = (url = 'https://spa.test/api/applications/export') =>
  new NextRequest(url, { headers: { Cookie: 'SESSIONID=S0' } })

describe('/api/applications/export Spring adapter', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); process.env.SPRING_AUTH_ENABLED = 'true'
    backend.mockReturnValue('https://spring.example.com')
    headers.mockReturnValue({ 'X-Backend-Api-Key': 'token' })
    session.mockResolvedValue(authorized)
  })

  it('forwards filters, preserves CSV bytes/headers, and relays both cookie sources', async () => {
    session.mockResolvedValue({ ...authorized, setCookie: 'SESSIONID=S1; Path=/' })
    fetchMock.mockResolvedValue(new Response(JSON.stringify([application]), {
      status: 200, headers: { 'Set-Cookie': 'SPRING_CSRF=csrf; Path=/' }
    }))
    const { GET } = await import('@/app/api/applications/export/route')
    const response = await GET(request('https://spa.test/api/applications/export?status=PENDING&vacancyId=cmc7q8v1r0000v5r4f9k0m2n3&search=%20Ana%20%2B%20P%C3%A9rez%20&sortBy=candidateName&sortDirection=asc'))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://spring.example.com/api/v1/applications?status=PENDING&vacancyId=cmc7q8v1r0000v5r4f9k0m2n3&search=Ana+%2B+P%C3%A9rez&sortBy=candidateName&sortDirection=asc',
      expect.objectContaining({ cache: 'no-store', headers: { 'X-Backend-Api-Key': 'token', Cookie: 'SESSIONID=S1' } }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="postulaciones-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(response.headers.get('Set-Cookie')).toContain('SESSIONID=S1')
    expect(response.headers.get('Set-Cookie')).toContain('SPRING_CSRF=csrf')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('\uFEFFNombre y Apellido;Email;Teléfono;Puesto;Fecha\n"Ana; Pérez";ana@empresa.com;+54 9 351 1111111;Diseñadora UX;04/03/2026')
  })

  it('returns the exact invalid-filter envelope without contacting Spring', async () => {
    const { GET } = await import('@/app/api/applications/export/route')
    const response = await GET(request('https://spa.test/api/applications/export?sortBy=invalid'))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Parámetros inválidos',
      details: [{ field: 'sortBy', message: 'Invalid option: expected one of "submittedAt"|"candidateName"|"status"' }]
    })
    expect(session).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([['anonymous', 401, 'No autorizado'], ['forbidden', 403, 'No autorizado'], ['unavailable', 503, 'Spring backend unavailable']] as const)(
    'maps Spring %s without legacy auth or data access', async (state, status, error) => {
      session.mockResolvedValue({ state })
      const { GET } = await import('@/app/api/applications/export/route')
      const response = await GET(request())
      expect(response.status).toBe(status)
      expect(auth).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled()
      await expect(response.json()).resolves.toEqual({ error })
    }
  )

  it('preserves 503/500 envelopes and uses NextAuth only when Spring auth is disabled', async () => {
    backend.mockReturnValueOnce(undefined)
    session.mockResolvedValue({ ...authorized, setCookie: 'SESSIONID=S1; Path=/' })
    const { GET } = await import('@/app/api/applications/export/route')
    const missing = await GET(request())
    expect(missing.status).toBe(503); expect(missing.headers.get('Set-Cookie')).toContain('SESSIONID=S1')
    fetchMock.mockRejectedValueOnce(new Error('connection refused'))
    expect((await GET(request())).status).toBe(503)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Export failed', code: 'EXPORT_FAILED' }), { status: 500 }))
    await expect((await GET(request())).json()).resolves.toEqual({ error: 'Export failed', code: 'EXPORT_FAILED' })
    fetchMock.mockResolvedValueOnce(new Response('not-json'))
    await expect((await GET(request())).json()).resolves.toEqual({ error: 'Error al exportar postulaciones' })
    session.mockClear(); auth.mockClear(); process.env.SPRING_AUTH_ENABLED = 'false'; auth.mockResolvedValue({ user: { role: 'ADMIN' } })
    fetchMock.mockResolvedValueOnce(new Response('[]'))
    expect((await GET(request())).status).toBe(200); expect(auth).toHaveBeenCalledOnce(); expect(session).not.toHaveBeenCalled()
  })
})
