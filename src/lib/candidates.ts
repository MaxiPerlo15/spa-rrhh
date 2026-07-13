import type { Application } from '@/lib/api/applications'
import { mapApplicationsToEntities, type ApplicationEntity } from '@/domain/application/ApplicationEntity'

export type CandidateSummary = {
  id: string
  candidateName: string
  email: string
  phone: string
  latestStatus: Application['status']
  latestSubmittedAt: string
  resumeUrl?: string
  resumeFileName?: string
  applications: Array<{
    id: string
    status: Application['status']
    submittedAt: string
    vacancyTitle: string
  }>
}

function getCandidateKey(application: Application) {
  return `candidate:${application.candidateId}`
}

export function buildCandidateSummaries(applications: Application[]): CandidateSummary[] {
  const grouped = new Map<string, ApplicationEntity[]>()
  const applicationEntities = mapApplicationsToEntities(applications)

  for (const application of applicationEntities) {
    const key = getCandidateKey(application.dto)
    const current = grouped.get(key) ?? []
    current.push(application)
    grouped.set(key, current)
  }

  return Array.from(grouped.values())
    .map((candidateApplications) => {
      const sortedApplications = [...candidateApplications].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      )
      const latestApplication = sortedApplications[0]

      return {
        id: latestApplication.candidate.id,
        candidateName: latestApplication.candidate.name,
        email: latestApplication.candidate.email,
        phone: latestApplication.candidate.phone,
        latestStatus: latestApplication.status,
        latestSubmittedAt: latestApplication.submittedAt,
        resumeUrl: latestApplication.candidate.resumeUrl,
        resumeFileName: latestApplication.candidate.resumeFileName,
        applications: sortedApplications.map((application) => ({
          id: application.id,
          status: application.status,
          submittedAt: application.submittedAt,
          vacancyTitle: application.vacancyTitle ?? 'Espontánea'
        }))
      }
    })
    .sort((a, b) => a.candidateName.localeCompare(b.candidateName, 'es', { sensitivity: 'base' }))
}
