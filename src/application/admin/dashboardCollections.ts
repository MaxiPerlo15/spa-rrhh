import { mapApplicationsToEntities, type ApplicationSortKey as DomainApplicationSortKey } from '@/domain/application/ApplicationEntity'
import { Candidate } from '@/domain/candidate/Candidate'
import { mapContactsToEntities, type ContactSortKey as DomainContactSortKey } from '@/domain/contact/ContactEntity'
import { mapVacanciesToEntities, type VacancySortKey as DomainVacancySortKey } from '@/domain/vacancy/VacancyEntity'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'
import type { CandidateSummary } from '@/lib/candidates'

export function buildFilteredVacancies(params: {
  vacancies: Vacancy[]
  filterStatus: string
  search: string
  sortBy: DomainVacancySortKey
  sortDirection: 'asc' | 'desc'
}) {
  return mapVacanciesToEntities(params.vacancies)
    .filter((vacancy) => vacancy.matchesStatus(params.filterStatus))
    .filter((vacancy) => vacancy.matchesSearch(params.search))
    .sort((a, b) => a.compareBy(b, params.sortBy, params.sortDirection))
    .map((vacancy) => vacancy.dto)
}

export function buildFilteredApplications(params: {
  applications: Application[]
  filterStatus: string
  filterVacancyId: string
  search: string
  sortBy: DomainApplicationSortKey
  sortDirection: 'asc' | 'desc'
}) {
  return mapApplicationsToEntities(params.applications)
    .filter((application) => application.matchesStatus(params.filterStatus))
    .filter((application) => application.matchesVacancy(params.filterVacancyId))
    .filter((application) => application.matchesSearch(params.search))
    .sort((a, b) => a.compareBy(b, params.sortBy, params.sortDirection))
    .map((application) => application.dto)
}

export function buildFilteredContacts(params: {
  contacts: Contact[]
  filterStatus: string
  search: string
  sortBy: DomainContactSortKey
  sortDirection: 'asc' | 'desc'
}) {
  return mapContactsToEntities(params.contacts)
    .filter((contact) => contact.matchesStatus(params.filterStatus))
    .filter((contact) => contact.matchesSearch(params.search))
    .sort((a, b) => a.compareBy(b, params.sortBy, params.sortDirection))
    .map((contact) => contact.dto)
}

export function buildFilteredCandidates(candidates: CandidateSummary[], search: string) {
  const query = search.trim()
  if (!query) return candidates

  return candidates.filter((candidate) =>
    new Candidate({
      id: candidate.id,
      name: candidate.candidateName,
      email: candidate.email,
      phone: candidate.phone,
      resumeUrl: candidate.resumeUrl,
      resumeFileName: candidate.resumeFileName
    }).matchesSearch(query)
  )
}

export function paginateItems<T>(items: T[], currentPage: number, itemsPerPage: number) {
  return items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
}

export function findFirstItemId<T extends { id: string }>(items: T[]) {
  return items[0]?.id ?? null
}

export function findFirstApplicationWithResumeId(applications: Application[]) {
  return applications.find((application) => Boolean(application.resumeUrl))?.id ?? null
}
