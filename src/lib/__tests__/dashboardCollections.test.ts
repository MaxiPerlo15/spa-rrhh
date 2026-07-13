import { describe, expect, it } from 'vitest'
import {
  buildFilteredApplications,
  buildFilteredCandidates,
  buildFilteredContacts,
  buildFilteredVacancies,
  findFirstApplicationWithResumeId,
  findFirstItemId,
  paginateItems,
} from '@/application/admin/dashboardCollections'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'
import type { CandidateSummary } from '@/lib/candidates'

const vacancies: Vacancy[] = [
  {
    id: 'vac-1',
    title: 'Backend Developer',
    location: 'Cordoba',
    workday: 'FULL_TIME',
    modality: 'HYBRID',
    status: 'active',
    createdAt: '2026-05-01T10:00:00.000Z'
  },
  {
    id: 'vac-2',
    title: 'Frontend Developer',
    location: 'Buenos Aires',
    workday: 'PART_TIME',
    modality: 'REMOTE',
    status: 'closed',
    createdAt: '2026-05-02T10:00:00.000Z'
  }
]

const applications: Application[] = [
  {
    id: 'app-1',
    candidateId: 'cand-1',
    candidateName: 'Ana Perez',
    email: 'ana@example.com',
    phone: '+549111111111',
    status: 'PENDING',
    submittedAt: '2026-05-01T10:00:00.000Z',
    vacancy: { id: 'vac-1', title: 'Backend Developer' },
    resumeUrl: 'https://utfs.io/f/cv-ana.pdf'
  },
  {
    id: 'app-2',
    candidateId: 'cand-2',
    candidateName: 'Carlos Diaz',
    email: 'carlos@example.com',
    phone: '+549222222222',
    status: 'REVIEWING',
    submittedAt: '2026-05-02T10:00:00.000Z',
    vacancy: { id: 'vac-2', title: 'Frontend Developer' }
  }
]

const contacts: Contact[] = [
  {
    id: 'con-1',
    name: 'Lucia',
    email: 'lucia@example.com',
    phone: '+549333333333',
    subject: 'Consulta',
    message: 'Hola',
    status: 'PENDING',
    createdAt: '2026-05-01T10:00:00.000Z'
  },
  {
    id: 'con-2',
    name: 'Martin',
    email: 'martin@example.com',
    phone: '+549444444444',
    subject: 'Servicios',
    message: 'Info',
    status: 'ARCHIVED',
    createdAt: '2026-05-02T10:00:00.000Z'
  }
]

const candidates: CandidateSummary[] = [
  {
    id: 'cand-1',
    candidateName: 'Ana Perez',
    email: 'ana@example.com',
    phone: '+549111111111',
    latestStatus: 'PENDING',
    latestSubmittedAt: '2026-05-01T10:00:00.000Z',
    applications: []
  },
  {
    id: 'cand-2',
    candidateName: 'Carlos Diaz',
    email: 'carlos@example.com',
    phone: '+549222222222',
    latestStatus: 'REVIEWING',
    latestSubmittedAt: '2026-05-02T10:00:00.000Z',
    applications: []
  }
]

describe('dashboardCollections', () => {
  it('filtra y ordena vacantes', () => {
    const result = buildFilteredVacancies({
      vacancies,
      filterStatus: 'all',
      search: 'developer',
      sortBy: 'createdAt',
      sortDirection: 'desc'
    })

    expect(result.map((vacancy) => vacancy.id)).toEqual(['vac-2', 'vac-1'])
  })

  it('filtra postulaciones por vacante, búsqueda y orden', () => {
    const result = buildFilteredApplications({
      applications,
      filterStatus: 'all',
      filterVacancyId: 'vac-1',
      search: 'ana',
      sortBy: 'candidateName',
      sortDirection: 'asc'
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('app-1')
  })

  it('filtra contactos por estado y búsqueda', () => {
    const result = buildFilteredContacts({
      contacts,
      filterStatus: 'PENDING',
      search: 'lucia',
      sortBy: 'name',
      sortDirection: 'asc'
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('con-1')
  })

  it('filtra candidatos por entidad de dominio', () => {
    const result = buildFilteredCandidates(candidates, 'carlos')

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('cand-2')
  })

  it('pagina y obtiene ids auxiliares', () => {
    expect(paginateItems([1, 2, 3, 4], 2, 2)).toEqual([3, 4])
    expect(findFirstItemId(applications)).toBe('app-1')
    expect(findFirstApplicationWithResumeId(applications)).toBe('app-1')
  })
})
