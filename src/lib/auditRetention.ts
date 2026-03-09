import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  DEFAULT_AUDIT_RETENTION_DAYS,
  SECURITY_AUDIT_RETENTION_DAYS
} from '@/lib/auditRetentionPolicy'

type RetentionSummary = {
  standardDeleted: number
  securityDeleted: number
  totalDeleted: number
  standardRetentionDays: number
  securityRetentionDays: number
}

function securityRetentionWhere(): Prisma.AdminAuditLogWhereInput {
  return {
    OR: [
      { outcome: { in: ['DENIED', 'ERROR'] } },
      { action: { startsWith: 'auth.' } },
      { action: { startsWith: 'security.' } }
    ]
  }
}

export async function purgeExpiredAdminAuditLogs(now = new Date()): Promise<RetentionSummary> {
  const securityWhere = securityRetentionWhere()
  const standardCutoff = new Date(now.getTime() - DEFAULT_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const securityCutoff = new Date(now.getTime() - SECURITY_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const [standardDeleted, securityDeleted] = await prisma.$transaction([
    prisma.adminAuditLog.deleteMany({
      where: {
        createdAt: { lt: standardCutoff },
        NOT: securityWhere
      }
    }),
    prisma.adminAuditLog.deleteMany({
      where: {
        createdAt: { lt: securityCutoff },
        ...securityWhere
      }
    })
  ])

  return {
    standardDeleted: standardDeleted.count,
    securityDeleted: securityDeleted.count,
    totalDeleted: standardDeleted.count + securityDeleted.count,
    standardRetentionDays: DEFAULT_AUDIT_RETENTION_DAYS,
    securityRetentionDays: SECURITY_AUDIT_RETENTION_DAYS
  }
}
