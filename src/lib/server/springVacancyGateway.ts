import { NextResponse } from 'next/server'
import { normalizeSpringVacancyStatus } from './springBackend'
import { normalizeLocation } from '@/lib/utils'
import type { VacancyDto } from '@/lib/dto/vacancy'

export type SpringVacancyResponse = {
  id: string
  titulo: string
  descripcion: string
  requisitos?: string | null
  ubicacionNombre?: string | null
  ubicacionDescripcion?: string | null
  jornada: string
  modalidad: string
  estadoActual: string
  fechaCreacion: string
  fechaPublicacion?: string | null
}

export type SpringVacancyCreatePayload = {
  titulo: string
  descripcion: string
  requisitos?: string
  ubicacionNombre?: string
  ubicacionDescripcion?: string
  jornada: string
  modalidad: string
}

export type SpringVacancyUpdatePayload = Partial<SpringVacancyCreatePayload>

export function mapSpringToDto(vacancy: SpringVacancyResponse): VacancyDto {
  return {
    id: vacancy.id,
    title: vacancy.titulo,
    description: vacancy.descripcion,
    location: vacancy.ubicacionNombre ?? '',
    workday: vacancy.jornada,
    modality: vacancy.modalidad,
    salary: undefined,
    requirements: vacancy.requisitos ?? undefined,
    benefits: undefined,
    status: normalizeSpringVacancyStatus(vacancy.estadoActual),
    createdAt: vacancy.fechaCreacion
  }
}

export function buildCreatePayload(data: {
  title: string
  description: string
  location: string
  workday: string
  modality: string
  requirements?: string
}): SpringVacancyCreatePayload {
  return {
    titulo: data.title,
    descripcion: data.description,
    requisitos: data.requirements,
    ubicacionNombre: normalizeLocation(data.location),
    ubicacionDescripcion: data.location,
    jornada: data.workday,
    modalidad: data.modality
  }
}

export function buildUpdatePayload(data: {
  title?: string
  description?: string
  location?: string
  workday?: string
  modality?: string
  requirements?: string
}): SpringVacancyUpdatePayload {
  const payload: SpringVacancyUpdatePayload = {}

  if (data.title !== undefined) payload.titulo = data.title
  if (data.description !== undefined) payload.descripcion = data.description
  if (data.requirements !== undefined) payload.requisitos = data.requirements
  if (data.location !== undefined) {
    payload.ubicacionNombre = normalizeLocation(data.location)
    payload.ubicacionDescripcion = data.location
  }
  if (data.workday !== undefined) payload.jornada = data.workday
  if (data.modality !== undefined) payload.modalidad = data.modality

  return payload
}

export function parseSpringError(errorBody: string): string {
  try {
    const parsed = JSON.parse(errorBody) as { error?: unknown; message?: unknown; detail?: unknown }
    const message = [parsed.error, parsed.message, parsed.detail].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    )

    if (message) return message.trim()
  } catch {
    // Fall back to the raw body below.
  }

  return errorBody.trim()
}

export function getUnsupportedSpringVacancyFields(data: {
  salary?: string
  benefits?: string
}): string[] {
  return (['salary', 'benefits'] as const).filter((field) => data[field] !== undefined)
}

export function rejectUnsupportedSpringVacancyFields(fields: string[]): NextResponse {
  return NextResponse.json(
    { error: `Spring-backed vacancies do not support these fields: ${fields.join(', ')}` },
    { status: 400 }
  )
}

export class SpringVacancyWriteError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SpringVacancyWriteError'
    this.status = status
  }
}
