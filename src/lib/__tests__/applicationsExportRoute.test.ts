import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const findManyMock = vi.fn()
const buildApplicationsCsvMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      findMany: findManyMock
    }
  }
}))

vi.mock('@/lib/csv/applicationsExport', () => ({
  buildApplicationsCsv: buildApplicationsCsvMock
}))

describe('/api/applications/export', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('retorna 401 cuando no hay sesión admin', async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import('@/app/api/applications/export/route')
    const request = new NextRequest('http://localhost:3000/api/applications/export')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('retorna CSV cuando la sesión es admin', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'ADMIN'
      }
    })
    findManyMock.mockResolvedValue([
      {
        candidateName: 'Ana',
        email: 'ana@empresa.com',
        phone: '+54 9 351 1111111',
        submittedAt: new Date('2026-03-04T00:00:00.000Z'),
        vacancy: {
          title: 'Diseñadora UX'
        }
      }
    ])
    buildApplicationsCsvMock.mockReturnValue('\uFEFFcsv-test')

    const { GET } = await import('@/app/api/applications/export/route')
    const request = new NextRequest(
      'http://localhost:3000/api/applications/export?status=PENDING&sortBy=submittedAt&sortDirection=desc'
    )
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/csv')
    expect(body).toContain('csv-test')
  })
})
