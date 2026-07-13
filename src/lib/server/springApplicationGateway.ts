import { getBackendUrl, getSpringBackendHeaders } from './springBackend'
import { parseSpringError } from './springVacancyGateway'

export type SpringApplicationDetailResponse = {
  id: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  status: string
  submittedAt: string
  vacancy: { id: string; title: string; location: string } | null
}

export class SpringApplicationWriteError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SpringApplicationWriteError'
    this.status = status
  }
}

export async function getApplication(
  id: string
): Promise<SpringApplicationDetailResponse | null> {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for application operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/applications/${id}`, {
    method: 'GET',
    headers: getSpringBackendHeaders()
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Spring backend rejected application lookup (${response.status}): ${errorBody}`
    )
  }

  return response.json() as Promise<SpringApplicationDetailResponse>
}

export async function updateApplicationStatus(
  id: string,
  status: string
): Promise<SpringApplicationDetailResponse> {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for application operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/applications/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getSpringBackendHeaders()
    },
    body: JSON.stringify({ status })
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 400 || response.status === 409 || response.status === 404) {
      const message = parseSpringError(errorBody) || `Error en la operación de aplicación`
      throw new SpringApplicationWriteError(response.status, message)
    }
    throw new Error(
      `Spring backend rejected application status update (${response.status}): ${errorBody}`
    )
  }

  return response.json() as Promise<SpringApplicationDetailResponse>
}

export async function deleteApplication(
  id: string
): Promise<{ success: true }> {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for application operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/applications/${id}`, {
    method: 'DELETE',
    headers: getSpringBackendHeaders()
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 404) {
      throw new SpringApplicationWriteError(404, parseSpringError(errorBody) || 'Postulación no encontrada')
    }
    throw new Error(
      `Spring backend rejected application delete (${response.status}): ${errorBody}`
    )
  }

  return { success: true }
}
