import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn()
  }
}))

import bcrypt from 'bcrypt'
import { createOrUpdateAdminUser, normalizeAdminEmail } from '../adminUsers'

describe('adminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never)
  })

  it('normaliza email admin', () => {
    expect(normalizeAdminEmail(' Admin@Empresa.com ')).toBe('admin@empresa.com')
  })

  it('crea un admin nuevo con nombre por defecto si no existe', async () => {
    const findUnique = vi.fn().mockResolvedValue(null)
    const create = vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@empresa.com',
      name: 'Administrador',
      role: 'ADMIN'
    })
    const update = vi.fn()

    const result = await createOrUpdateAdminUser(
      { user: { findUnique, create, update } },
      { email: 'Admin@Empresa.com', password: 'Password123!' }
    )

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@empresa.com' },
      select: { id: true, name: true }
    })
    expect(create).toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(result.email).toBe('admin@empresa.com')
  })

  it('actualiza un admin existente sin pisar nombre si no se informa uno nuevo', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'admin-1',
      name: 'Admin Existente'
    })
    const update = vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'admin@empresa.com',
      name: 'Admin Existente',
      role: 'ADMIN'
    })
    const create = vi.fn()

    await createOrUpdateAdminUser(
      { user: { findUnique, create, update } },
      { email: 'admin@empresa.com', password: 'Password123!' }
    )

    expect(update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: {
        passwordHash: 'hashed-password',
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    expect(create).not.toHaveBeenCalled()
  })
})
