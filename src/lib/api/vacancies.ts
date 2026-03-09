/**
 * Vacancies API Service
 * Centraliza todas las llamadas a la API relacionadas con vacantes
 */
import { apiFetch } from './http'

export interface Vacancy {
  id: string
  title: string
  location: string
  workday: string
  modality: string
  status: string
  createdAt: string
  description?: string
  salary?: string
  requirements?: string
  benefits?: string
}

/**
 * Normaliza una vacante desde el servidor (status en mayúsculas) al frontend (minúsculas)
 */
function normalizeVacancy(vacancy: Omit<Vacancy, 'status'> & { status: string }): Vacancy {
  return {
    ...vacancy,
    status: vacancy.status.toLowerCase()
  }
}

export interface CreateVacancyData {
  title: string
  description: string
  location: string
  workday: string
  modality: string
  salary?: string
  requirements?: string
  benefits?: string
}

export interface UpdateVacancyData extends Partial<CreateVacancyData> {
  status?: string
}

/**
 * Obtiene todas las vacantes
 */
export async function getVacancies(options?: { includeAll?: boolean }): Promise<Vacancy[]> {
  const query = options?.includeAll ? '?all=1' : ''
  const response = await apiFetch(`/api/vacancies${query}`)
  if (!response.ok) {
    throw new Error('Error al obtener vacantes')
  }
  const vacancies = await response.json()
  return vacancies.map(normalizeVacancy)
}

/**
 * Obtiene una vacante por ID
 */
export async function getVacancyById(id: string): Promise<Vacancy> {
  const response = await apiFetch(`/api/vacancies/${id}`)
  if (!response.ok) {
    throw new Error('Error al obtener la vacante')
  }
  const vacancy = await response.json()
  return normalizeVacancy(vacancy)
}

/**
 * Crea una nueva vacante
 */
export async function createVacancy(data: CreateVacancyData): Promise<Vacancy> {
  const response = await apiFetch('/api/vacancies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al crear la vacante')
  }
  
  const vacancy = await response.json()
  return normalizeVacancy(vacancy)
}

/**
 * Actualiza una vacante existente
 */
export async function updateVacancy(id: string, data: UpdateVacancyData): Promise<Vacancy> {
  const response = await apiFetch(`/api/vacancies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar la vacante')
  }
  
  const vacancy = await response.json()
  return normalizeVacancy(vacancy)
}

/**
 * Elimina una vacante
 */
export async function deleteVacancy(id: string): Promise<void> {
  const response = await apiFetch(`/api/vacancies/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Error al eliminar la vacante')
  }
}

/**
 * Alterna el estado de una vacante (active/closed)
 */
export async function toggleVacancyStatus(vacancy: Vacancy): Promise<Vacancy> {
  const newStatus = vacancy.status === 'active' ? 'closed' : 'active'
  return updateVacancy(vacancy.id, { status: newStatus })
}
