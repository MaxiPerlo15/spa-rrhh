import type { ApplicationStatus, Vacancy } from '@prisma/client'

type ApplicationWithVacancy = {
  id: string
  candidateName: string
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  status: ApplicationStatus
  submittedAt: Date
  vacancy?: Pick<Vacancy, 'id' | 'title' | 'location'> | null
}

export type ApplicationAdminDto = {
  id: string
  candidateName: string
  email: string
  phone: string
  resumeUrl?: string
  resumeFileName?: string
  coverLetter?: string
  status: ApplicationStatus
  submittedAt: string
  vacancy?: {
    id: string
    title: string
    location: string
  }
}

export function toApplicationAdminDto(application: ApplicationWithVacancy): ApplicationAdminDto {
  return {
    id: application.id,
    candidateName: application.candidateName,
    email: application.email,
    phone: application.phone,
    resumeUrl: application.resumeUrl ?? undefined,
    resumeFileName: application.resumeFileName ?? undefined,
    coverLetter: application.coverLetter ?? undefined,
    status: application.status,
    submittedAt: application.submittedAt.toISOString(),
    vacancy: application.vacancy
      ? {
          id: application.vacancy.id,
          title: application.vacancy.title,
          location: application.vacancy.location
        }
      : undefined
  }
}
