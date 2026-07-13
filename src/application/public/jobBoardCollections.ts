export type JobBoardVacancy = {
  id: string
  title: string
  description: string
  location: string
  workday: 'FULL_TIME' | 'PART_TIME' | 'PROJECT_BASED' | 'INTERNSHIP'
  modality: 'ON_SITE' | 'REMOTE' | 'HYBRID'
  salary?: string
  requirements?: string
  benefits?: string
  createdAt: string
}

export type JobBoardFilters = {
  searchTerm: string
  workday: string
  modality: string
  location: string
}

class JobBoardVacancyEntity {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly workday: JobBoardVacancy['workday']
  readonly modality: JobBoardVacancy['modality']
  readonly location: string
  readonly dto: JobBoardVacancy

  constructor(dto: JobBoardVacancy) {
    this.id = dto.id
    this.title = dto.title
    this.description = dto.description
    this.workday = dto.workday
    this.modality = dto.modality
    this.location = dto.location
    this.dto = dto
  }

  matchesJobBoardSearch(search: string) {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return (
      this.title.toLowerCase().includes(query) ||
      this.description.toLowerCase().includes(query) ||
      this.location.toLowerCase().includes(query)
    )
  }

  matchesWorkday(workday: string) {
    return workday === 'all' || this.workday === workday
  }

  matchesModality(modality: string) {
    return modality === 'all' || this.modality === modality
  }

  matchesLocation(location: string) {
    return location === 'all' || this.location === location
  }
}

function mapJobBoardVacancies(vacancies: JobBoardVacancy[]) {
  return vacancies.map((vacancy) => new JobBoardVacancyEntity(vacancy))
}

export function buildJobBoardVacancies(vacancies: JobBoardVacancy[], filters: JobBoardFilters) {
  return mapJobBoardVacancies(vacancies)
    .filter((vacancy) => vacancy.matchesJobBoardSearch(filters.searchTerm))
    .filter((vacancy) => vacancy.matchesWorkday(filters.workday))
    .filter((vacancy) => vacancy.matchesModality(filters.modality))
    .filter((vacancy) => vacancy.matchesLocation(filters.location))
    .map((vacancy) => vacancy.dto)
}

export function buildJobBoardLocations(vacancies: JobBoardVacancy[]) {
  return Array.from(new Set(vacancies.map((vacancy) => vacancy.location)))
}

export function mapApiVacanciesToJobBoardVacancies(vacancies: Array<{
  id: string
  title: string
  description?: string
  location: string
  workday: string
  modality: string
  salary?: string
  requirements?: string
  benefits?: string
  createdAt: string
}>): JobBoardVacancy[] {
  return vacancies.map((vacancy) => ({
    id: vacancy.id,
    title: vacancy.title,
    description: vacancy.description ?? '',
    location: vacancy.location,
    workday: vacancy.workday as JobBoardVacancy['workday'],
    modality: vacancy.modality as JobBoardVacancy['modality'],
    salary: vacancy.salary,
    requirements: vacancy.requirements,
    benefits: vacancy.benefits,
    createdAt: vacancy.createdAt
  }))
}
