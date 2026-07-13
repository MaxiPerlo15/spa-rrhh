import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRawMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock
  }
}))

describe('/api/health GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 when database is ready', async () => {
    queryRawMock.mockResolvedValue([{ '?column?': 1 }])

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ status: 'ok', database: 'ready' })
    expect(queryRawMock).toHaveBeenCalledOnce()
  })

  it('returns 503 when database is unavailable', async () => {
    queryRawMock.mockRejectedValue(new Error('db down'))

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'error', database: 'unavailable' })
  })
})
