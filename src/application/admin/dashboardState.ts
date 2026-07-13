import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'

export type DashboardStats = {
  totalVacancies: number
  activeVacancies: number
  totalApplications: number
  pendingContacts: number
}

export function buildDashboardStats(params: {
  vacancies: Vacancy[]
  applications: Application[]
  contacts: Contact[]
}): DashboardStats {
  return {
    totalVacancies: params.vacancies.length,
    activeVacancies: params.vacancies.filter((vacancy) => vacancy.status === 'active').length,
    totalApplications: params.applications.length,
    pendingContacts: params.contacts.filter((contact) => contact.status === 'PENDING').length
  }
}

export function prependItem<T>(items: T[], item: T) {
  return [item, ...items]
}

export function replaceItemById<T extends { id: string }>(items: T[], id: string, nextItem: T) {
  return items.map((item) => (item.id === id ? nextItem : item))
}

export function removeItemById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id)
}

export function mergeApplicationsById(items: Application[], updatedApplications: Application[]) {
  const updatedById = new Map(updatedApplications.map((application) => [application.id, application]))
  return items.map((application) => updatedById.get(application.id) ?? application)
}
