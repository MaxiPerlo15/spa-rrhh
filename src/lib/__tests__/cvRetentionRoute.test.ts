import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const purgeExpiredApplicationResumesMock = vi.fn()

vi.mock('@/lib/cvRetention', () => ({
  purgeExpiredApplicationResumes: purgeExpiredApplicationResumesMock
}))

describe('/api/internal/cv-retention', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.CV_RETENTION_CRON_SECRET = 'secret-test'
  })

  it('retorna 401 sin secret válido', async () => {
    const { POST } = await import('@/app/api/internal/cv-retention/route')
    const request = new NextRequest('http://localhost:3000/api/internal/cv-retention', {
      method: 'POST'
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('retorna 200 con secret válido', async () => {
    purgeExpiredApplicationResumesMock.mockResolvedValue({
      scanned: 1,
      expired: 1,
      deletedFiles: 1,
      cleanedRows: 1,
      skipped: 0,
      errors: [],
      retentionDays: 180,
      cutoffIso: '2025-09-05T00:00:00.000Z'
    })

    const { POST } = await import('@/app/api/internal/cv-retention/route')
    const request = new NextRequest('http://localhost:3000/api/internal/cv-retention', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer secret-test'
      }
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.summary.cleanedRows).toBe(1)
  })
})
