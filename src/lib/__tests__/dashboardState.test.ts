import { describe, expect, it } from 'vitest'
import {
  buildDashboardStats,
  mergeApplicationsById,
  prependItem,
  removeItemById,
  replaceItemById,
} from '@/application/admin/dashboardState'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'

describe('dashboardState', () => {
  it('calcula stats del dashboard', () => {
    const vacancies: Vacancy[] = [
      { id: 'v1', title: 'A', location: 'Cba', workday: 'FULL_TIME', modality: 'HYBRID', status: 'active', createdAt: '' },
      { id: 'v2', title: 'B', location: 'BsAs', workday: 'PART_TIME', modality: 'REMOTE', status: 'closed', createdAt: '' }
    ]
    const applications: Application[] = [
      { id: 'a1', candidateId: 'c1', candidateName: 'Ana', email: 'ana@mail.com', phone: '1', status: 'PENDING', submittedAt: '' }
    ]
    const contacts: Contact[] = [
      { id: 'c1', name: 'Lucia', email: 'lucia@mail.com', phone: '1', subject: 'Hola', message: 'M', status: 'PENDING', createdAt: '' },
      { id: 'c2', name: 'Martin', email: 'martin@mail.com', phone: '2', subject: 'Hola', message: 'M', status: 'ARCHIVED', createdAt: '' }
    ]

    expect(buildDashboardStats({ vacancies, applications, contacts })).toEqual({
      totalVacancies: 2,
      activeVacancies: 1,
      totalApplications: 1,
      pendingContacts: 1
    })
  })

  it('aplica operaciones de colección básicas', () => {
    expect(prependItem([2, 3], 1)).toEqual([1, 2, 3])
    expect(removeItemById([{ id: 'a' }, { id: 'b' }], 'a')).toEqual([{ id: 'b' }])
    expect(replaceItemById([{ id: 'a', value: 1 }, { id: 'b', value: 2 }], 'b', { id: 'b', value: 3 })).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 3 }
    ])
  })

  it('mergea postulaciones actualizadas por id', () => {
    const items: Application[] = [
      { id: 'a1', candidateId: 'c1', candidateName: 'Ana', email: 'ana@mail.com', phone: '1', status: 'PENDING', submittedAt: '' },
      { id: 'a2', candidateId: 'c2', candidateName: 'Luis', email: 'luis@mail.com', phone: '2', status: 'REVIEWING', submittedAt: '' }
    ]
    const updated: Application[] = [
      { id: 'a2', candidateId: 'c2', candidateName: 'Luis Gomez', email: 'luis@mail.com', phone: '2', status: 'ACCEPTED', submittedAt: '' }
    ]

    expect(mergeApplicationsById(items, updated)).toMatchObject([
      { id: 'a1', candidateName: 'Ana' },
      { id: 'a2', candidateName: 'Luis Gomez', status: 'ACCEPTED' }
    ])
  })
})
