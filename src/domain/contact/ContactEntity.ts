import type { Contact as ContactDto } from '@/lib/api/contacts'

export type ContactSortKey = 'createdAt' | 'name' | 'status'
export type SortDirection = 'asc' | 'desc'

export class ContactEntity {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly subject: string
  readonly status: ContactDto['status']
  readonly createdAt: string
  readonly dto: ContactDto

  constructor(dto: ContactDto) {
    this.id = dto.id
    this.name = dto.name
    this.email = dto.email
    this.subject = dto.subject
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
      this.name.toLowerCase().includes(query) ||
      this.email.toLowerCase().includes(query) ||
      this.subject.toLowerCase().includes(query)
    )
  }

  compareBy(other: ContactEntity, sortBy: ContactSortKey, direction: SortDirection) {
    const factor = direction === 'asc' ? 1 : -1

    if (sortBy === 'createdAt') {
      return (new Date(this.createdAt).getTime() - new Date(other.createdAt).getTime()) * factor
    }

    if (sortBy === 'status') {
      return this.status.localeCompare(other.status) * factor
    }

    return this.name.localeCompare(other.name, 'es', { sensitivity: 'base' }) * factor
  }
}

export function mapContactsToEntities(contacts: ContactDto[]) {
  return contacts.map((contact) => new ContactEntity(contact))
}
