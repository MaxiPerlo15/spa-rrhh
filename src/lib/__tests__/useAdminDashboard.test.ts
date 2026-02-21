// @vitest-environment jsdom

import { renderHook, act, waitFor } from '@testing-library/react'
import { expect, vi, describe, it, beforeEach } from 'vitest'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import * as vacanciesApi from '../../lib/api/vacancies'
import * as applicationsApi from '../../lib/api/applications'
import * as contactsApi from '../../lib/api/contacts'
import type { Vacancy } from '../../lib/api/vacancies'
import type { Application } from '../../lib/api/applications'
import type { Contact } from '../../lib/api/contacts'

const vacancyA: Vacancy = {
  id: 'v1',
  title: 'Frontend Developer',
  location: 'Cordoba',
  workday: 'FULL_TIME',
  modality: 'HYBRID',
  status: 'active',
  createdAt: new Date().toISOString()
}

const vacancyB: Vacancy = {
  id: 'v2',
  title: 'Backend Developer',
  location: 'Buenos Aires',
  workday: 'PART_TIME',
  modality: 'REMOTE',
  status: 'closed',
  createdAt: new Date().toISOString()
}

const applicationA: Application = {
  id: 'a1',
  candidateName: 'Maxi',
  email: 'maxi@example.com',
  phone: '+549111111111',
  status: 'PENDING',
  submittedAt: new Date().toISOString(),
  vacancy: { id: 'v1', title: 'Frontend Developer' }
}

const applicationB: Application = {
  id: 'a2',
  candidateName: 'Ana',
  email: 'ana@example.com',
  phone: '+549222222222',
  status: 'REVIEWING',
  submittedAt: new Date().toISOString(),
  vacancy: { id: 'v2', title: 'Backend Developer' }
}

const contactA: Contact = {
  id: 'c1',
  name: 'Carlos',
  email: 'carlos@example.com',
  phone: '+549333333333',
  subject: 'Consulta',
  message: 'Hola',
  status: 'PENDING',
  createdAt: new Date().toISOString()
}

const contactB: Contact = {
  id: 'c2',
  name: 'Lucia',
  email: 'lucia@example.com',
  phone: '+549444444444',
  subject: 'Servicios',
  message: 'Info',
  status: 'RESPONDED',
  createdAt: new Date().toISOString()
}

vi.mock('../../lib/api/vacancies.ts', () => ({
  getVacancies: vi.fn(() => Promise.resolve([vacancyA, vacancyB])),
  createVacancy: vi.fn(),
  updateVacancy: vi.fn(),
  deleteVacancy: vi.fn(),
  toggleVacancyStatus: vi.fn()
}))

vi.mock('../../lib/api/applications.ts', () => ({
  getApplications: vi.fn(() => Promise.resolve([applicationA, applicationB])),
  updateApplicationStatus: vi.fn(),
  deleteApplication: vi.fn()
}))

vi.mock('../../lib/api/contacts.ts', () => ({
  getContacts: vi.fn(() => Promise.resolve([contactA, contactB])),
  updateContactStatus: vi.fn(),
  deleteContact: vi.fn()
}))

describe('useAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vacanciesApi.getVacancies).mockResolvedValue([vacancyA, vacancyB])
    vi.mocked(applicationsApi.getApplications).mockResolvedValue([applicationA, applicationB])
    vi.mocked(contactsApi.getContacts).mockResolvedValue([contactA, contactB])
  })

  it('Carga datos y calcula stats correctamente', async () => {
    const { result } = renderHook(() => useAdminDashboard())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.vacancies).toHaveLength(2)
    expect(result.current.applications).toHaveLength(2)
    expect(result.current.contacts).toHaveLength(2)
    expect(result.current.stats).toEqual({
      totalVacancies: 2,
      activeVacancies: 1,
      totalApplications: 2,
      pendingContacts: 1
    })
  })

  it('Maneja errores al cargar datos', async () => {
    vi.mocked(vacanciesApi.getVacancies).mockRejectedValueOnce(new Error('Error de red'))
    const { result } = renderHook(() => useAdminDashboard())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Error de red')
  })

  it('maneja create/update/delete/toggle de vacantes', async () => {
    const createdVacancy: Vacancy = {
      ...vacancyA,
      id: 'v3',
      title: 'Data Engineer',
      status: 'active'
    }
    const updatedVacancy: Vacancy = {
      ...vacancyA,
      title: 'Frontend Senior'
    }
    const toggledVacancy: Vacancy = {
      ...vacancyA,
      status: 'closed'
    }

    vi.mocked(vacanciesApi.createVacancy).mockResolvedValue(createdVacancy)
    vi.mocked(vacanciesApi.updateVacancy).mockResolvedValue(updatedVacancy)
    vi.mocked(vacanciesApi.toggleVacancyStatus).mockResolvedValue(toggledVacancy)
    vi.mocked(vacanciesApi.deleteVacancy).mockResolvedValue()

    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createVacancy({
        title: createdVacancy.title,
        description: 'desc',
        location: createdVacancy.location,
        workday: createdVacancy.workday,
        modality: createdVacancy.modality
      })
    })
    expect(result.current.vacancies[0].id).toBe('v3')

    await act(async () => {
      await result.current.updateVacancy('v1', { title: 'Frontend Senior' })
    })
    expect(result.current.vacancies.find((v) => v.id === 'v1')?.title).toBe('Frontend Senior')

    await act(async () => {
      await result.current.toggleVacancyStatus(vacancyA)
    })
    expect(result.current.vacancies.find((v) => v.id === 'v1')?.status).toBe('closed')

    await act(async () => {
      await result.current.deleteVacancy('v2')
    })
    expect(result.current.vacancies.some((v) => v.id === 'v2')).toBe(false)
  })

  it('maneja update/delete de postulaciones y contactos', async () => {
    const updatedApplication: Application = {
      ...applicationA,
      status: 'ACCEPTED'
    }
    const updatedContact: Contact = {
      ...contactA,
      status: 'ARCHIVED'
    }

    vi.mocked(applicationsApi.updateApplicationStatus).mockResolvedValue(updatedApplication)
    vi.mocked(applicationsApi.deleteApplication).mockResolvedValue()
    vi.mocked(contactsApi.updateContactStatus).mockResolvedValue(updatedContact)
    vi.mocked(contactsApi.deleteContact).mockResolvedValue()

    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.updateApplicationStatus('a1', 'ACCEPTED')
    })
    expect(result.current.applications.find((a) => a.id === 'a1')?.status).toBe('ACCEPTED')

    await act(async () => {
      await result.current.deleteApplication('a2')
    })
    expect(result.current.applications.some((a) => a.id === 'a2')).toBe(false)

    await act(async () => {
      await result.current.updateContactStatus('c1', 'ARCHIVED')
    })
    expect(result.current.contacts.find((c) => c.id === 'c1')?.status).toBe('ARCHIVED')

    await act(async () => {
      await result.current.deleteContact('c2')
    })
    expect(result.current.contacts.some((c) => c.id === 'c2')).toBe(false)
  })
})
