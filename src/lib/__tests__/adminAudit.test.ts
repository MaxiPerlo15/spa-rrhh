import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  executeRawMock,
  warnMock
} = vi.hoisted(() => ({
  executeRawMock: vi.fn(),
  warnMock: vi.fn()
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: executeRawMock
  }
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: warnMock
  }
}))

import { auditAdminAction } from '../adminAudit'

describe('auditAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executeRawMock.mockResolvedValue(undefined)
  })

  it('registra la auditoría usando la primera IP reenviada y metadata serializada', async () => {
    const request = {
      headers: new Headers({
        'x-forwarded-for': '203.0.113.10, 203.0.113.11',
        'user-agent': 'Vitest'
      })
    } as never

    await auditAdminAction({
      request,
      actor: { id: 'admin-1', email: 'admin@empresa.com' },
      action: 'VACANCY_CREATE',
      resourceType: 'vacancy',
      resourceId: 'vac-1',
      outcome: 'SUCCESS',
      metadata: { status: 'ACTIVE' }
    })

    expect(executeRawMock).toHaveBeenCalledOnce()
    const queryArgs = executeRawMock.mock.calls[0] ?? []
    expect(queryArgs.at(-4)).toBe('SUCCESS')
    expect(queryArgs.at(-3)).toBe('203.0.113.10')
    expect(queryArgs.at(-2)).toBe('Vitest')
    expect(queryArgs.at(-1)).toBe(JSON.stringify({ status: 'ACTIVE' }))
  })

  it('usa x-real-ip y metadata nula cuando no hay campos opcionales', async () => {
    const request = {
      headers: new Headers({
        'x-real-ip': '198.51.100.8'
      })
    } as never

    await auditAdminAction({
      request,
      action: 'CONTACT_DELETE',
      resourceType: 'contact',
      outcome: 'DENIED'
    })

    const queryArgs = executeRawMock.mock.calls[0] ?? []
    expect(queryArgs.at(-3)).toBe('198.51.100.8')
    expect(queryArgs.at(-2)).toBeNull()
    expect(queryArgs.at(-1)).toBeNull()
  })

  it('degrada a warning si falla el insert de auditoría', async () => {
    executeRawMock.mockRejectedValue(new Error('db down'))

    await expect(
      auditAdminAction({
        action: 'SETTINGS_UPDATE',
        resourceType: 'settings',
        outcome: 'ERROR'
      })
    ).resolves.toBeUndefined()

    expect(warnMock).toHaveBeenCalledWith('No se pudo registrar auditoría admin', {
      action: 'SETTINGS_UPDATE',
      resourceType: 'settings',
      resourceId: undefined,
      outcome: 'ERROR',
      error: 'db down'
    })
  })
})
