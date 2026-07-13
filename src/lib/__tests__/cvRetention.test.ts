import { beforeEach, describe, expect, it, vi } from 'vitest'

const findManyMock = vi.fn()
const updateMock = vi.fn()
const deleteFilesMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    candidate: {
      findMany: findManyMock,
      update: updateMock
    }
  }
}))

vi.mock('uploadthing/server', () => ({
  UTApi: class {
    deleteFiles = deleteFilesMock
  }
}))

describe('cvRetention', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.CV_RETENTION_DAYS
    delete process.env.UPLOADTHING_TOKEN
  })

  it('calcula cutoff usando 180 días por defecto', async () => {
    const { getCvRetentionCutoff, DEFAULT_CV_RETENTION_DAYS } = await import('../cvRetention')
    const now = new Date('2026-03-04T00:00:00.000Z')
    const cutoff = getCvRetentionCutoff(now)

    expect(DEFAULT_CV_RETENTION_DAYS).toBe(180)
    expect(cutoff.toISOString()).toBe('2025-09-05T00:00:00.000Z')
  })

  it('no limpia metadata si falla el borrado remoto', async () => {
    process.env.UPLOADTHING_TOKEN = 'test-token'
    findManyMock
      .mockResolvedValueOnce([
        {
          id: 'cand-1',
          resumeKey: 'cv-key-1',
          createdAt: new Date('2025-01-01T00:00:00.000Z')
        }
      ])
      .mockResolvedValueOnce([])
    deleteFilesMock.mockRejectedValueOnce(new Error('remote failure'))
    updateMock.mockResolvedValue({ id: 'app-1' })

    const { purgeExpiredApplicationResumes } = await import('../cvRetention')
    const summary = await purgeExpiredApplicationResumes(new Date('2026-03-04T00:00:00.000Z'))

    expect(findManyMock).toHaveBeenCalled()
    expect(deleteFilesMock).toHaveBeenCalledWith('cv-key-1')
    expect(updateMock).not.toHaveBeenCalled()
    expect(summary.expired).toBe(1)
    expect(summary.cleanedRows).toBe(0)
    expect(summary.deletedFiles).toBe(0)
    expect(summary.errors.some((error) => error.includes('remote failure'))).toBe(true)
  })

  it('limpia metadata cuando el borrado remoto fue exitoso', async () => {
    process.env.UPLOADTHING_TOKEN = 'test-token'
    findManyMock
      .mockResolvedValueOnce([
        {
          id: 'cand-2',
          resumeKey: 'cv-key-2',
          createdAt: new Date('2025-01-01T00:00:00.000Z')
        }
      ])
      .mockResolvedValueOnce([])
    deleteFilesMock.mockResolvedValueOnce({ success: true, deletedCount: 1 })
    updateMock.mockResolvedValue({ id: 'app-2' })

    const { purgeExpiredApplicationResumes } = await import('../cvRetention')
    const summary = await purgeExpiredApplicationResumes(new Date('2026-03-04T00:00:00.000Z'))

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'cand-2' },
      data: {
        resumeKey: null,
        resumeUrl: null,
        resumeFileName: null
      }
    })
    expect(summary.deletedFiles).toBe(1)
    expect(summary.cleanedRows).toBe(1)
  })
})
