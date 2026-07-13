import { UTApi } from 'uploadthing/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const DEFAULT_CV_RETENTION_DAYS = 180
const DAY_IN_MS = 24 * 60 * 60 * 1000
const BATCH_SIZE = 200

export type CvRetentionSummary = {
  retentionDays: number
  cutoffIso: string
  scanned: number
  expired: number
  deletedFiles: number
  cleanedRows: number
  skipped: number
  errors: string[]
}

let uploadThingApi: UTApi | null = null

function getUploadThingApi(): UTApi | null {
  const token = process.env.UPLOADTHING_TOKEN?.trim()
  if (!token) return null
  if (!uploadThingApi) {
    uploadThingApi = new UTApi({ token })
  }
  return uploadThingApi
}

export function resolveCvRetentionDays(): number {
  const rawDays = process.env.CV_RETENTION_DAYS
  if (!rawDays) return DEFAULT_CV_RETENTION_DAYS
  const parsedDays = Number.parseInt(rawDays, 10)
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return DEFAULT_CV_RETENTION_DAYS
  }
  return parsedDays
}

export function getCvRetentionCutoff(now = new Date(), days = resolveCvRetentionDays()): Date {
  return new Date(now.getTime() - days * DAY_IN_MS)
}

async function deleteResumeFromUploadThing(resumeKey: string): Promise<{ deleted: boolean; skipped: boolean; error?: string }> {
  const utapi = getUploadThingApi()
  if (!utapi) {
    return { deleted: false, skipped: true, error: 'UPLOADTHING_TOKEN no configurado' }
  }

  try {
    const result = await utapi.deleteFiles(resumeKey)
    if (!result.success) {
      return { deleted: false, skipped: false, error: 'UploadThing respondió sin éxito' }
    }
    return { deleted: result.deletedCount > 0, skipped: false }
  } catch (error) {
    return {
      deleted: false,
      skipped: false,
      error: error instanceof Error ? error.message : 'Error desconocido al borrar archivo remoto'
    }
  }
}

export async function purgeExpiredApplicationResumes(now = new Date()): Promise<CvRetentionSummary> {
  const retentionDays = resolveCvRetentionDays()
  const cutoff = getCvRetentionCutoff(now, retentionDays)
  const summary: CvRetentionSummary = {
    retentionDays,
    cutoffIso: cutoff.toISOString(),
    scanned: 0,
    expired: 0,
    deletedFiles: 0,
    cleanedRows: 0,
    skipped: 0,
    errors: []
  }

  let cursorId: string | undefined
  while (true) {
    const expiredCandidates = await prisma.candidate.findMany({
      where: {
        OR: [
          { resumeKey: { not: null } },
          { resumeUrl: { not: null } },
          { resumeFileName: { not: null } }
        ],
        applications: {
          some: {
            submittedAt: { lte: cutoff }
          },
          none: {
            submittedAt: { gt: cutoff }
          }
        }
      },
      select: {
        id: true,
        resumeKey: true,
        createdAt: true
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1
          }
        : {}),
      take: BATCH_SIZE
    })

    if (expiredCandidates.length === 0) break
    cursorId = expiredCandidates[expiredCandidates.length - 1]?.id

    for (const candidate of expiredCandidates) {
      summary.scanned += 1
      summary.expired += 1

      if (candidate.resumeKey) {
        const deleteResult = await deleteResumeFromUploadThing(candidate.resumeKey)
        if (deleteResult.deleted) {
          summary.deletedFiles += 1
          try {
            await prisma.candidate.update({
              where: { id: candidate.id },
              data: {
                resumeKey: null,
                resumeUrl: null,
                resumeFileName: null
              }
            })
            summary.cleanedRows += 1
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido al limpiar metadata'
            summary.errors.push(`candidate=${candidate.id}: ${message}`)
          }
        } else {
          if (deleteResult.skipped) {
            summary.skipped += 1
          }
          if (deleteResult.error) {
            summary.errors.push(`candidate=${candidate.id}: ${deleteResult.error}`)
          }
        }
      } else {
        summary.skipped += 1
      }
    }
  }

  logger.info('Purga de retención de CV finalizada', summary)
  return summary
}
