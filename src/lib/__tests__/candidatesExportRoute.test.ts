import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const executeMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:8080'),
  getSpringBackendHeaders: vi.fn(() => ({}))
}))

vi.mock('@/application/exports/ExportCandidatesUseCase', () => ({
  ExportCandidatesUseCase: class {
    execute = executeMock
  }
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch')

describe('/api/admin/candidates/export', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna 401 cuando no hay sesión admin', async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates/export')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('retorna CSV cuando la sesión es admin y Spring responde', async () => {
    authMock.mockResolvedValue({
      user: { role: 'ADMIN' }
    })

    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'app-1',
            candidateId: 'cand-1',
            coverLetter: null,
            status: 'PENDING',
            submittedAt: '2026-03-04T00:00:00.000Z',
            vacancy: {
              id: 'vac-1',
              title: 'Diseñadora UX',
              location: 'Buenos Aires'
            },
            candidate: {
              id: 'cand-1',
              name: 'Ana',
              lastName: 'Pérez',
              email: 'ana@empresa.com',
              phone: '+54 9 351 1111111',
              resumeUrl: 'https://cv.test/ana.pdf',
              resumeFileName: 'cv-ana.pdf'
            }
          }
        ]),
        { status: 200 }
      )
    )

    executeMock.mockReturnValue({
      fileName: 'candidatos-2026-05-03.csv',
      mimeType: 'text/csv; charset=utf-8',
      content: '\uFEFFcsv-test'
    })

    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const request = new NextRequest(
      'http://localhost:3000/api/admin/candidates/export?search=ana'
    )
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(body).toContain('csv-test')
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/applications',
      expect.objectContaining({ method: 'GET' })
    )
    expect(executeMock).toHaveBeenCalledOnce()
  })

  it('retorna 503 cuando BACKEND_URL no está configurado', async () => {
    authMock.mockResolvedValue({
      user: { role: 'ADMIN' }
    })
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    vi.mocked(getBackendUrl).mockReturnValueOnce(null)

    const { GET } = await import('@/app/api/admin/candidates/export/route')
    const request = new NextRequest('http://localhost:3000/api/admin/candidates/export')
    const response = await GET(request)

    expect(response.status).toBe(503)
  })
})
