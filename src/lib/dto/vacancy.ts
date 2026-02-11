import type { Application, Vacancy } from '@prisma/client'

type VacancyWithOptionalApplications = Vacancy & {
  applications?: Pick<Application, 'id' | 'candidateName' | 'status' | 'submittedAt'>[]
}

export interface VacancyDto {
  id: string
  title: string
  description: string
  location: string
  workday: string
  modality: string
  salary?: string
  requirements?: string
  benefits?: string
  status: string
  createdAt: string
  applications?: {
    id: string
    candidateName: string
    status: string
    submittedAt: string
  }[]
}

export function toVacancyDto(vacancy: VacancyWithOptionalApplications): VacancyDto {
  return {
    id: vacancy.id,
    title: vacancy.title,
    description: vacancy.description,
    location: vacancy.location,
    workday: vacancy.workday,
    modality: vacancy.modality,
    salary: vacancy.salary || undefined,
    requirements: vacancy.requirements || undefined,
    benefits: vacancy.benefits || undefined,
    status: vacancy.status.toLowerCase(),
    createdAt: vacancy.createdAt.toISOString(),
    applications: vacancy.applications?.map((application) => ({
      id: application.id,
      candidateName: application.candidateName,
      status: application.status,
      submittedAt: application.submittedAt.toISOString()
    }))
  }
}
