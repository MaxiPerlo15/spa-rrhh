import { describe, expect, it, beforeEach, afterEach } from 'vitest'

const ORIGINAL_ENV = process.env

describe('springBackend', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.BACKEND_URL
    delete process.env.BACKEND_INTERNAL_API_TOKEN
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('normalizes outbound Spring vacancy statuses consistently', async () => {
    const { normalizeSpringVacancyStatus } = await import('@/lib/server/springBackend')
    expect(normalizeSpringVacancyStatus('CREATED')).toBe('draft')
    expect(normalizeSpringVacancyStatus('ACTIVE')).toBe('active')
    expect(normalizeSpringVacancyStatus('INACTIVE')).toBe('inactive')
    expect(normalizeSpringVacancyStatus('CLOSED')).toBe('closed')
  })

  it('getBackendUrl returns null when BACKEND_URL is not set', async () => {
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    expect(getBackendUrl()).toBeNull()
  })

  it('getBackendUrl trims trailing slashes', async () => {
    process.env.BACKEND_URL = 'https://spring.example.com///'
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    expect(getBackendUrl()).toBe('https://spring.example.com')
  })

  it('getBackendUrl trims whitespace', async () => {
    process.env.BACKEND_URL = '  https://spring.example.com  '
    const { getBackendUrl } = await import('@/lib/server/springBackend')
    expect(getBackendUrl()).toBe('https://spring.example.com')
  })

  it('getSpringBackendHeaders returns empty object when no token', async () => {
    const { getSpringBackendHeaders } = await import('@/lib/server/springBackend')
    expect(getSpringBackendHeaders()).toEqual({})
  })

  it('getSpringBackendHeaders returns token header when token is set', async () => {
    process.env.BACKEND_INTERNAL_API_TOKEN = 'my-secret-token'
    const { getSpringBackendHeaders } = await import('@/lib/server/springBackend')
    expect(getSpringBackendHeaders()).toEqual({ 'X-Backend-Api-Key': 'my-secret-token' })
  })

  it('getSpringBackendHeaders throws in production when token is missing but backend is configured', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    process.env.BACKEND_URL = 'https://spring.example.com'
    const { getSpringBackendHeaders } = await import('@/lib/server/springBackend')
    expect(() => getSpringBackendHeaders()).toThrow(
      'BACKEND_INTERNAL_API_TOKEN is required when Spring backend proxying is enabled'
    )
  })

  it('getSpringBackendHeaders does not throw in production when backend URL is not set', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    delete process.env.BACKEND_URL
    const { getSpringBackendHeaders } = await import('@/lib/server/springBackend')
    expect(getSpringBackendHeaders()).toEqual({})
  })

  it('getSpringBackendHeaders does not throw in development even when token is missing', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'development'
    process.env.BACKEND_URL = 'https://spring.example.com'
    const { getSpringBackendHeaders } = await import('@/lib/server/springBackend')
    expect(getSpringBackendHeaders()).toEqual({})
  })
})
