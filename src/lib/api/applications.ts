/**
 * Applications API Service
 * Centraliza todas las llamadas a la API relacionadas con postulaciones
 */
import { apiFetch } from './http'
import { ApiRequestError } from './errors'

export interface Application {
  id: string
  candidateName: string
  email: string
  phone: string
  resumeUrl?: string
  resumeFileName?: string
  resumeKey?: string
  coverLetter?: string
  status: 'PENDING' | 'REVIEWING' | 'INTERVIEWED' | 'ACCEPTED' | 'REJECTED'
  submittedAt: string
  vacancy: {
    id: string
    title: string
  }
}

export interface CreateApplicationData {
  vacancyId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl?: string
  resumeFileName?: string
  resumeKey?: string
  coverLetter?: string
  captchaToken?: string
}

type ApiValidationError = {
  error?: string
  code?: string
  details?: Array<{ field?: string; message?: string }>
}

async function getApiErrorPayload(
  response: Response,
  fallbackMessage: string
): Promise<{ message: string; code?: string }> {
  try {
    const error = (await response.json()) as ApiValidationError
    const firstDetail = error.details?.find((detail) => detail.message)?.message
    return {
      message: firstDetail || error.error || fallbackMessage,
      code: error.code
    }
  } catch {
    return { message: fallbackMessage }
  }
}

/**
 * Obtiene todas las postulaciones
 */
export async function getApplications(): Promise<Application[]> {
  const response = await apiFetch('/api/applications')
  if (!response.ok) {
    throw new Error('Error al obtener postulaciones')
  }
  return response.json()
}

/**
 * Obtiene una postulación por ID
 */
export async function getApplicationById(id: string): Promise<Application> {
  const response = await apiFetch(`/api/applications/${id}`)
  if (!response.ok) {
    throw new Error('Error al obtener la postulación')
  }
  return response.json()
}

/**
 * Crea una nueva postulación
 */
export async function createApplication(data: CreateApplicationData): Promise<Application> {
  const response = await apiFetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const payload = await getApiErrorPayload(response, 'Error al crear la postulación')
    throw new ApiRequestError(payload.message, response.status, payload.code)
  }
  
  return response.json()
}

/**
 * Actualiza el estado de una postulación
 */
export async function updateApplicationStatus(
  id: string, 
  status: Application['status']
): Promise<Application> {
  const response = await apiFetch(`/api/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  
  if (!response.ok) {
    throw new Error('Error al actualizar el estado de la postulación')
  }
  
  return response.json()
}

/**
 * Elimina una postulación
 */
export async function deleteApplication(id: string): Promise<void> {
  const response = await apiFetch(`/api/applications/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Error al eliminar la postulación')
  }
}
