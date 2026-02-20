export function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const maybeCode = (error as { code?: unknown }).code
  return typeof maybeCode === 'string' ? maybeCode : null
}

export function isMissingTableOrColumnError(error: unknown): boolean {
  const code = getPrismaErrorCode(error)
  return code === 'P2021' || code === 'P2022'
}

export function isPrismaRecordNotFoundError(error: unknown): boolean {
  return getPrismaErrorCode(error) === 'P2025'
}
