import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRawMock = vi.fn()
const getBackendUrlMock = vi.fn()
const getSpringBackendHeadersMock = vi.fn()

vi.mock('@/lib/server/springBackend', () => ({
  getBackendUrl: getBackendUrlMock,
  getSpringBackendHeaders: getSpringBackendHeadersMock
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock
  }
}))

describe('/api/health GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBackendUrlMock.mockReturnValue('https://spring.example.com')
    getSpringBackendHeadersMock.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' })
  })

  it('forwards Spring database readiness success without caching', async () => {
    queryRawMock.mockRejectedValue(new Error('Next must not probe Prisma'))
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', database: 'ready' }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ status: 'ok', database: 'ready' })
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/health', {
      cache: 'no-store',
      headers: { 'X-Backend-Api-Key': 'test-token' }
    })
    expect(queryRawMock).not.toHaveBeenCalled()
  })

  it('maps an unavailable Spring database to the browser 503 contract without caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'error', database: 'unavailable' }), { status: 503 })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ status: 'error', database: 'unavailable' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(queryRawMock).not.toHaveBeenCalled()
  })
})
