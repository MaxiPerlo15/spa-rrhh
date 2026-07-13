import {
  getBackendUrl,
  getSpringBackendHeaders
} from '@/lib/server/springBackend'
import type { SpringVacancyResponse } from '@/lib/server/springVacancyGateway'

export type ApplicationVacancyMetadata = {
  id: string
  title: string
  location: string
}

const SPRING_METADATA_TIMEOUT_MS = 1500

class SpringVacancyMetadataContractError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpringVacancyMetadataContractError'
  }
}

function isSpringVacancyResponse(payload: unknown): payload is SpringVacancyResponse {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.titulo === 'string'
    && (candidate.ubicacionNombre === undefined
      || candidate.ubicacionNombre === null
      || typeof candidate.ubicacionNombre === 'string')
}

function parseSpringVacancyResponse(payload: unknown): SpringVacancyResponse {
  if (!isSpringVacancyResponse(payload)) {
    throw new SpringVacancyMetadataContractError('Spring backend returned malformed vacancy metadata payload')
  }

  return payload
}

async function getSpringVacancyMetadata(id: string): Promise<ApplicationVacancyMetadata | null> {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return null
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}`, {
    method: 'GET',
    headers: getSpringBackendHeaders(),
    signal: AbortSignal.timeout(SPRING_METADATA_TIMEOUT_MS)
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new SpringVacancyMetadataContractError(
      `Spring backend rejected vacancy metadata lookup (${response.status}): ${errorBody}`
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new SpringVacancyMetadataContractError('Spring backend returned invalid JSON for vacancy metadata payload')
  }

  const vacancy = parseSpringVacancyResponse(payload)
  return {
    id: vacancy.id,
    title: vacancy.titulo,
    location: vacancy.ubicacionNombre ?? ''
  }
}

export async function getApplicationVacancyMetadata(id: string): Promise<ApplicationVacancyMetadata | null> {
  if (!getBackendUrl()) {
    return null
  }

  return getSpringVacancyMetadata(id)
}
