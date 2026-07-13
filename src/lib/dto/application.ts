export type ApplicationStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'INTERVIEWED'
  | 'ACCEPTED'
  | 'REJECTED'

type ApplicationWithVacancy = {
  id: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  status: ApplicationStatus | string
  submittedAt: Date | string
  vacancy?: { id: string; title: string; location: string } | null
}

export type ApplicationAdminDto = {
  id: string
  candidateId: string
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
    candidateId: application.candidateId,
    candidateName: application.candidateName,
    email: application.email,
    phone: application.phone,
    resumeUrl: application.resumeUrl ?? undefined,
    resumeFileName: application.resumeFileName ?? undefined,
    coverLetter: application.coverLetter ?? undefined,
    status: application.status as ApplicationStatus,
    submittedAt: application.submittedAt instanceof Date
      ? application.submittedAt.toISOString()
      : application.submittedAt,
    vacancy: application.vacancy
      ? {
          id: application.vacancy.id,
          title: application.vacancy.title,
          location: application.vacancy.location
        }
      : undefined
  }
}
