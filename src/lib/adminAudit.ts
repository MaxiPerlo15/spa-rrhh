import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type AdminAuditOutcome = 'SUCCESS' | 'DENIED' | 'ERROR'

interface AuditActor {
  id?: string | null
  email?: string | null
}

interface AuditPayload {
  request?: NextRequest
  actor?: AuditActor
  action: string
  resourceType: string
  resourceId?: string
  outcome: AdminAuditOutcome
  metadata?: Record<string, unknown>
}

function getRequestIp(request?: NextRequest): string | null {
  if (!request) return null
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    return firstIp || null
  }
  return request.headers.get('x-real-ip')
}

export async function auditAdminAction(payload: AuditPayload): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "AdminAuditLog"
      ("id", "actorUserId", "actorEmail", "action", "resourceType", "resourceId", "outcome", "ip", "userAgent", "metadata", "createdAt")
      VALUES
      (
        ${crypto.randomUUID()},
        ${payload.actor?.id ?? null},
        ${payload.actor?.email ?? null},
        ${payload.action},
        ${payload.resourceType},
        ${payload.resourceId ?? null},
        ${payload.outcome}::"AuditOutcome",
        ${getRequestIp(payload.request)},
        ${payload.request?.headers.get('user-agent') ?? null},
        ${payload.metadata ? JSON.stringify(payload.metadata) : null}::jsonb,
        NOW()
      )
    `
  } catch (error) {
    logger.warn('No se pudo registrar auditoría admin', {
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      outcome: payload.outcome,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
