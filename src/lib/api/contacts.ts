/**
 * Contacts API Service
 * Centraliza todas las llamadas a la API relacionadas con contactos
 */
import { apiFetch } from './http'

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: 'PENDING' | 'RESPONDED' | 'ARCHIVED'
  createdAt: string
}

export interface CreateContactData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  captchaToken?: string
}

type ApiValidationError = {
  error?: string
  details?: Array<{ field?: string; message?: string }>
}

async function getApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  try {
    const error = (await response.json()) as ApiValidationError
    const firstDetail = error.details?.find((detail) => detail.message)?.message
    return firstDetail || error.error || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

/**
 * Obtiene todos los contactos
 */
export async function getContacts(): Promise<Contact[]> {
  const response = await apiFetch('/api/contacts')
  if (!response.ok) {
    throw new Error('Error al obtener contactos')
  }
  return response.json()
}

/**
 * Obtiene un contacto por ID
 */
export async function getContactById(id: string): Promise<Contact> {
  const response = await apiFetch(`/api/contacts/${id}`)
  if (!response.ok) {
    throw new Error('Error al obtener el contacto')
  }
  return response.json()
}

/**
 * Crea un nuevo contacto
 */
export async function createContact(data: CreateContactData): Promise<Contact> {
  const response = await apiFetch('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Error al crear el contacto'))
  }
  
  return response.json()
}

/**
 * Actualiza el estado de un contacto
 */
export async function updateContactStatus(
  id: string,
  status: Contact['status']
): Promise<Contact> {
  const response = await apiFetch(`/api/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  
  if (!response.ok) {
    throw new Error('Error al actualizar el estado del contacto')
  }
  
  return response.json()
}

/**
 * Elimina un contacto
 */
export async function deleteContact(id: string): Promise<void> {
  const response = await apiFetch(`/api/contacts/${id}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Error al eliminar el contacto')
  }
}
