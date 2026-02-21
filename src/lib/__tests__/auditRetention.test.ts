import { describe, expect, it } from 'vitest'
import { isSecuritySensitiveAudit } from '../auditRetentionPolicy'

describe('auditRetention', () => {
  it('marca outcomes DENIED como sensibles', () => {
    expect(isSecuritySensitiveAudit('vacancy.update', 'DENIED')).toBe(true)
  })

  it('marca outcomes ERROR como sensibles', () => {
    expect(isSecuritySensitiveAudit('contact.delete', 'ERROR')).toBe(true)
  })

  it('marca prefijos auth. como sensibles', () => {
    expect(isSecuritySensitiveAudit('auth.login.failed', 'SUCCESS')).toBe(true)
  })

  it('marca prefijos security. como sensibles', () => {
    expect(isSecuritySensitiveAudit('security.anomaly.detected', 'SUCCESS')).toBe(true)
  })

  it('mantiene auditoría funcional estándar como no sensible', () => {
    expect(isSecuritySensitiveAudit('vacancy.create', 'SUCCESS')).toBe(false)
  })
})
