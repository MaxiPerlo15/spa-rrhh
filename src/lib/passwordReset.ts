import { createHash, randomBytes } from 'crypto'

const DEFAULT_RESET_TOKEN_TTL_MINUTES = 30
const MIN_RESET_PASSWORD_LENGTH = 10

function getTokenSecret() {
  return process.env.NEXTAUTH_SECRET || 'fallback-secret'
}

function getTokenTtlMinutes() {
  const raw = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || DEFAULT_RESET_TOKEN_TTL_MINUTES)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RESET_TOKEN_TTL_MINUTES
}

export function getPasswordResetTokenTtlMinutes() {
  return getTokenTtlMinutes()
}

export function generateRawResetToken() {
  return randomBytes(32).toString('hex')
}

export function hashResetToken(token: string) {
  return createHash('sha256')
    .update(`${token}:${getTokenSecret()}`)
    .digest('hex')
}

export function getResetTokenExpiryDate() {
  return new Date(Date.now() + getTokenTtlMinutes() * 60_000)
}

export function buildPasswordResetLink(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`
}

export function validateNewPassword(password: string) {
  const trimmed = password.trim()
  if (trimmed.length < MIN_RESET_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_RESET_PASSWORD_LENGTH} caracteres`
  }

  if (!/[A-Z]/.test(trimmed) || !/[a-z]/.test(trimmed) || !/[0-9]/.test(trimmed)) {
    return 'La contraseña debe incluir mayúsculas, minúsculas y números'
  }

  return undefined
}
