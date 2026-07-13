import { describe, expect, it, beforeEach, afterEach } from 'vitest'

describe('prismaError', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('getPrismaErrorCode returns code when error has string code', async () => {
    const { getPrismaErrorCode } = await import('@/lib/prismaError')
    expect(getPrismaErrorCode({ code: 'P2025' })).toBe('P2025')
  })

  it('getPrismaErrorCode returns null for null error', async () => {
    const { getPrismaErrorCode } = await import('@/lib/prismaError')
    expect(getPrismaErrorCode(null)).toBeNull()
  })

  it('getPrismaErrorCode returns null for non-object error', async () => {
    const { getPrismaErrorCode } = await import('@/lib/prismaError')
    expect(getPrismaErrorCode('string')).toBeNull()
  })

  it('getPrismaErrorCode returns null when code is not a string', async () => {
    const { getPrismaErrorCode } = await import('@/lib/prismaError')
    expect(getPrismaErrorCode({ code: 123 })).toBeNull()
  })

  it('isMissingTableOrColumnError returns true for P2021', async () => {
    const { isMissingTableOrColumnError } = await import('@/lib/prismaError')
    expect(isMissingTableOrColumnError({ code: 'P2021' })).toBe(true)
  })

  it('isMissingTableOrColumnError returns true for P2022', async () => {
    const { isMissingTableOrColumnError } = await import('@/lib/prismaError')
    expect(isMissingTableOrColumnError({ code: 'P2022' })).toBe(true)
  })

  it('isMissingTableOrColumnError returns false for other codes', async () => {
    const { isMissingTableOrColumnError } = await import('@/lib/prismaError')
    expect(isMissingTableOrColumnError({ code: 'P2025' })).toBe(false)
  })

  it('canUseSchemaDriftFallback returns true in non-production with P2021', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'test'
    const { canUseSchemaDriftFallback } = await import('@/lib/prismaError')
    expect(canUseSchemaDriftFallback({ code: 'P2021' })).toBe(true)
  })

  it('canUseSchemaDriftFallback returns false in production', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'production'
    const { canUseSchemaDriftFallback } = await import('@/lib/prismaError')
    expect(canUseSchemaDriftFallback({ code: 'P2021' })).toBe(false)
  })

  it('canUseSchemaDriftFallback returns false for non-matching error', async () => {
    ;(process.env as Record<string, string>).NODE_ENV = 'test'
    const { canUseSchemaDriftFallback } = await import('@/lib/prismaError')
    expect(canUseSchemaDriftFallback({ code: 'P2025' })).toBe(false)
  })

  it('isPrismaRecordNotFoundError returns true for P2025', async () => {
    const { isPrismaRecordNotFoundError } = await import('@/lib/prismaError')
    expect(isPrismaRecordNotFoundError({ code: 'P2025' })).toBe(true)
  })

  it('isPrismaRecordNotFoundError returns false for other codes', async () => {
    const { isPrismaRecordNotFoundError } = await import('@/lib/prismaError')
    expect(isPrismaRecordNotFoundError({ code: 'P2021' })).toBe(false)
  })
})
