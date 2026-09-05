import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const getSpringSessionMock = vi.fn()
const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()
const fetchMock = vi.fn()
const authorizedSession = {
  state: 'authorized',
  user: { userId: 'admin-1', email: 'admin@example.com', nombreUsuario: 'Admin',
    rol: { id: 'role-1', nombre: 'Administrador', permisos: ['admin:access'] } }
}
const springApplication = {
  id: 'application-1', candidateId: 'candidate-1', candidateName: 'Ana Pérez',
  email: 'ana@empresa.com', phone: '+54 9 351 1111111', resumeUrl: 'https://cv.test/ana.pdf',
  resumeFileName: 'cv-ana.pdf', coverLetter: 'Interested', status: 'PENDING',
  submittedAt: '2026-03-04T00:00:00.000Z', vacancy: { id: 'vacancy-1', title: 'Diseñadora UX', location: 'Buenos Aires' }
}

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/springSession', () => ({ getSpringSession: getSpringSessionMock }))
vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock, getSpringBackendHeaders: getSpringBackendHeadersMock,
  isSpringAuthEnabled: vi.fn(() => process.env.SPRING_AUTH_ENABLED === 'true')
}))
vi.stubGlobal('fetch', fetchMock)

function request(url = 'https://spa-rrhh.test/api/admin/candidates/export') {
  return new NextRequest(url, { headers: { Cookie: 'SESSIONID=original-session' } })
}

describe('/api/admin/candidates/export Spring adapter', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); process.env.SPRING_AUTH_ENABLED = 'true'
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
    getSpringSessionMock.mockResolvedValue(authorizedSession)
  })

  it.each([
    [undefined, 'SESSIONID=original-session'],
    ['SESSIONID=rotated-session; Path=/; HttpOnly; SameSite=Lax', 'SESSIONID=rotated-session']
  ])('forwards the %s session and preserves the CSV contract', async (setCookie, cookie) => {
    getSpringSessionMock.mockResolvedValue({ ...authorizedSession, ...(setCookie ? { setCookie } : {}) })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([springApplication]), {
      status: 200, headers: { 'Set-Cookie': 'SPRING_CSRF=csrf; Path=/' }
    }))
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const response = await GET(request('https://spa-rrhh.test/api/admin/candidates/export?search=Ana%20%2B%20P%C3%A9rez'))
    const body = await response.text()

    expect(getSpringSessionMock).toHaveBeenCalledWith('SESSIONID=original-session')
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/applications?search=Ana%20%2B%20P%C3%A9rez', expect.objectContaining({
      headers: { 'X-Backend-Api-Key': 'test-token', Cookie: cookie }
    }))
    expect(response.status).toBe(200); expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment; filename="candidatos-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(body).toContain('Nombre y Apellido;Email;Teléfono')
    if (setCookie) expect(response.headers.get('Set-Cookie')).toContain(setCookie); expect(response.headers.get('Set-Cookie')).toContain('SPRING_CSRF=csrf')
  })

  it.each([
    [{ state: 'anonymous' }, 401, 'No autorizado'], [{ state: 'forbidden' }, 403, 'No autorizado'],
    [{ state: 'unavailable' }, 503, 'Spring backend unavailable']
  ])('maps Spring session failures without proxying or falling back', async (session, status, error) => {
    getSpringSessionMock.mockResolvedValue(session)
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const response = await GET(request())
    expect(response.status).toBe(status); await expect(response.json()).resolves.toEqual({ error })
    expect(fetchMock).not.toHaveBeenCalled(); expect(authMock).not.toHaveBeenCalled()
  })

  it('preserves a Spring error envelope', async () => {
    const payload = { error: 'Export failed', code: 'EXPORT_FAILED' }
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 500 }))
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const response = await GET(request())
    expect(response.status).toBe(500); await expect(response.json()).resolves.toEqual(payload)
  })

  it('returns the existing unavailable envelope when Spring cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('connection refused'))
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const response = await GET(request())
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'Spring backend unavailable' })
  })

  it('retains the NextAuth fallback only when Spring auth is disabled', async () => {
    process.env.SPRING_AUTH_ENABLED = 'false'; authMock.mockResolvedValue({ user: { role: 'ADMIN' } })
    fetchMock.mockResolvedValueOnce(new Response('[]', { status: 200 }))
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    expect((await GET(request())).status).toBe(200)
    expect(authMock).toHaveBeenCalledOnce(); expect(getSpringSessionMock).not.toHaveBeenCalled()
  })
})
