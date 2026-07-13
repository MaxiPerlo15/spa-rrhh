import { createHash } from 'crypto'

// Java parity: ApplicationManager.buildPersonKey() in the Spring backend
// must produce identical SHA-256 hashes for the same inputs.
// See: backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function buildPersonKey(email: string, phone: string): string {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePhone(phone)
  const fingerprint = `${normalizedEmail}|${normalizedPhone}`
  return createHash('sha256').update(fingerprint).digest('hex')
}
