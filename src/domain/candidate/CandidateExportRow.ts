import { applicationStatusLabels } from '@/lib/applicationStatus'
import type { Application } from '@/lib/api/applications'

type CandidateExportRowSource = {
  candidateName: string
  email: string
  phone: string
  resumeFileName?: string
  resumeUrl?: string
  latestStatus: Application['status']
  latestSubmittedAt: string
  latestVacancyTitle: string
  applicationsCount: number
}

function formatDateForCsv(dateIso: string): string {
  const date = new Date(dateIso)
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export class CandidateExportRow {
  constructor(
    readonly candidateName: string,
    readonly email: string,
    readonly phone: string,
    readonly resume: string,
    readonly latestStatus: string,
    readonly latestSubmittedAt: string,
    readonly latestVacancyTitle: string,
    readonly applicationsCount: string
  ) {}

  static from(source: CandidateExportRowSource) {
    return new CandidateExportRow(
      source.candidateName,
      source.email,
      source.phone,
      source.resumeFileName ?? (source.resumeUrl ? 'Disponible' : 'No disponible'),
      applicationStatusLabels[source.latestStatus],
      formatDateForCsv(source.latestSubmittedAt),
      source.latestVacancyTitle,
      String(source.applicationsCount)
    )
  }
}
