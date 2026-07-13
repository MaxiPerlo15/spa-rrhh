import type { Application as ApplicationDto } from '@/lib/api/applications'
import { Candidate } from '@/domain/candidate/Candidate'

export type ApplicationSortKey = 'submittedAt' | 'candidateName' | 'status'
export type SortDirection = 'asc' | 'desc'

export class ApplicationEntity {
  readonly id: string
  readonly status: ApplicationDto['status']
  readonly submittedAt: string
  readonly vacancyId?: string
  readonly vacancyTitle?: string
  readonly candidate: Candidate
  readonly dto: ApplicationDto

  constructor(dto: ApplicationDto) {
    this.id = dto.id
    this.status = dto.status
    this.submittedAt = dto.submittedAt
    this.vacancyId = dto.vacancy?.id
    this.vacancyTitle = dto.vacancy?.title
    this.candidate = new Candidate({
      id: dto.candidateId,
      name: dto.candidateName,
      email: dto.email,
      phone: dto.phone,
      resumeUrl: dto.resumeUrl,
      resumeFileName: dto.resumeFileName
    })
    this.dto = dto
  }

  matchesSearch(search: string) {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return (
      this.candidate.matchesSearch(query) ||
      (this.vacancyTitle ?? 'espontanea').toLowerCase().includes(query)
    )
  }

  matchesStatus(status: string) {
    return status === 'all' || this.status === status
  }

  matchesVacancy(vacancyId: string) {
    return vacancyId === 'all' || this.vacancyId === vacancyId
  }

  compareBy(other: ApplicationEntity, sortBy: ApplicationSortKey, direction: SortDirection) {
    const factor = direction === 'asc' ? 1 : -1

    if (sortBy === 'submittedAt') {
      return (new Date(this.submittedAt).getTime() - new Date(other.submittedAt).getTime()) * factor
    }

    if (sortBy === 'status') {
      return this.status.localeCompare(other.status) * factor
    }

    return this.candidate.compareByName(other.candidate) * factor
  }
}

export function mapApplicationsToEntities(applications: ApplicationDto[]) {
  return applications.map((application) => new ApplicationEntity(application))
}
