import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMock = vi.fn()
const deleteMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: authMock
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    adminNotification: {
      delete: deleteMock,
      update: updateMock
    }
  }
}))

describe('/api/admin/notifications/[id]', () => {
  const notificationId = 'cmc7q8v1r0000v5r4f9k0m2n3'

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('NEXTAUTH_URL', 'https://spa-rrhh.test')
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        role: 'ADMIN'
      }
    })
  })

  it('devuelve 404 cuando se intenta borrar una notificación inexistente', async () => {
    deleteMock.mockRejectedValue({ code: 'P2025' })

    const { DELETE } = await import('@/app/api/admin/notifications/[id]/route')
    const request = new NextRequest(`https://spa-rrhh.test/api/admin/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        origin: 'https://spa-rrhh.test'
      }
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ id: notificationId })
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe('Notificación no encontrada')
  })
})
