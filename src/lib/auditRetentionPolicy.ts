import { AuditOutcome } from '@prisma/client'

export const DEFAULT_AUDIT_RETENTION_DAYS = 90
export const SECURITY_AUDIT_RETENTION_DAYS = 180

const securityActionPrefixes = ['auth.', 'security.'] as const

export function isSecuritySensitiveAudit(action: string, outcome: AuditOutcome): boolean {
  if (outcome === 'DENIED' || outcome === 'ERROR') return true
  return securityActionPrefixes.some((prefix) => action.startsWith(prefix))
}
