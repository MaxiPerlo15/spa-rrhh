const BACKEND_INTERNAL_TOKEN_HEADER = 'X-Backend-Api-Key'

export function getBackendUrl() {
  const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '')
  return backendUrl || null
}

export function getSpringBackendHeaders(): Record<string, string> {
  const token = process.env.BACKEND_INTERNAL_API_TOKEN?.trim()

  if (token) {
    return { [BACKEND_INTERNAL_TOKEN_HEADER]: token }
  }

  if (process.env.NODE_ENV === 'production' && getBackendUrl()) {
    throw new Error('BACKEND_INTERNAL_API_TOKEN is required when Spring backend proxying is enabled')
  }

  return {}
}

export function normalizeSpringVacancyStatus(status: string) {
  const normalizedStatus = status.trim().toUpperCase()
  return (normalizedStatus === 'CREATED' ? 'DRAFT' : normalizedStatus).toLowerCase()
}
