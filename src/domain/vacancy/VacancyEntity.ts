import type { Vacancy as VacancyDto } from '@/lib/api/vacancies'

export type VacancySortKey = 'createdAt' | 'title' | 'location' | 'status'
export type SortDirection = 'asc' | 'desc'

export class VacancyEntity {
  readonly id: string
  readonly title: string
  readonly location: string
  readonly status: string
  readonly createdAt: string
  readonly dto: VacancyDto

  constructor(dto: VacancyDto) {
    this.id = dto.id
    this.title = dto.title
    this.location = dto.location
    this.status = dto.status
    this.createdAt = dto.createdAt
    this.dto = dto
  }

  matchesStatus(status: string) {
    return status === 'all' || this.status === status
  }

  matchesSearch(search: string) {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return (
      this.title.toLowerCase().includes(query) ||
      this.location.toLowerCase().includes(query)
    )
  }

  compareBy(other: VacancyEntity, sortBy: VacancySortKey, direction: SortDirection) {
    const factor = direction === 'asc' ? 1 : -1

    if (sortBy === 'createdAt') {
      return (new Date(this.createdAt).getTime() - new Date(other.createdAt).getTime()) * factor
    }

    if (sortBy === 'status') {
      return this.status.localeCompare(other.status) * factor
    }

    return this[sortBy].localeCompare(other[sortBy], 'es', { sensitivity: 'base' }) * factor
  }
}

export function mapVacanciesToEntities(vacancies: VacancyDto[]) {
  return vacancies.map((vacancy) => new VacancyEntity(vacancy))
}
