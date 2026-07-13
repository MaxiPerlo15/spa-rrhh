import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'

describe('rejectIfUntrustedOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rechaza requests sin Origin/Referer en producción', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://spa-rrhh.example')

    const request = new NextRequest('https://spa-rrhh.example/api/admin/settings', {
      method: 'PATCH'
    })

    const response = rejectIfUntrustedOrigin(request)

    expect(response?.status).toBe(403)
  })

  it('acepta requests con Origin permitido', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://spa-rrhh.example')

    const request = new NextRequest('https://spa-rrhh.example/api/admin/settings', {
      method: 'PATCH',
      headers: {
        origin: 'https://spa-rrhh.example'
      }
    })

    const response = rejectIfUntrustedOrigin(request)

    expect(response).toBeNull()
  })
})
