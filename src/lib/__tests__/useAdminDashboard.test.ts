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

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

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
  candidateId: 'cand-a1',
  candidateName: 'Maxi',
  email: 'maxi@example.com',
  phone: '+549111111111',
  status: 'PENDING',
  submittedAt: new Date().toISOString(),
  vacancy: { id: 'v1', title: 'Frontend Developer' }
}

const applicationB: Application = {
  id: 'a2',
  candidateId: 'cand-a2',
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
  createAdminCandidate: vi.fn(),
  updateAdminCandidate: vi.fn(),
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

  it('no carga datos mientras está deshabilitado', async () => {
    const { result } = renderHook(() => useAdminDashboard({ enabled: false }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(vacanciesApi.getVacancies).not.toHaveBeenCalled()
    expect(applicationsApi.getApplications).not.toHaveBeenCalled()
    expect(contactsApi.getContacts).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
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
      status: 'inactive'
    }
    const closedVacancy: Vacancy = {
      ...vacancyB,
      status: 'closed'
    }

    vi.mocked(vacanciesApi.createVacancy).mockResolvedValue(createdVacancy)
    vi.mocked(vacanciesApi.updateVacancy).mockResolvedValue(updatedVacancy)
    vi.mocked(vacanciesApi.toggleVacancyStatus).mockResolvedValue(toggledVacancy)
    vi.mocked(vacanciesApi.deleteVacancy).mockResolvedValue(closedVacancy)

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
    expect(result.current.vacancies.find((v) => v.id === 'v1')?.status).toBe('inactive')

    await act(async () => {
      await result.current.deleteVacancy('v2')
    })
    expect(result.current.vacancies.find((v) => v.id === 'v2')?.status).toBe('closed')
  })

  it('maneja create/update/delete de postulaciones y contactos', async () => {
    const createdApplication: Application = {
      id: 'a3',
      candidateId: 'cand-a3',
      candidateName: 'Laura',
      email: 'laura@example.com',
      phone: '+5493517777777',
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    }
    const updatedApplication: Application = {
      ...applicationA,
      status: 'ACCEPTED'
    }
    const candidateUpdatedApplications: Application[] = [
      {
        ...applicationA,
        candidateName: 'Maxi Perlo',
        email: 'maxi.perlo@example.com',
        phone: '+549351000000'
      }
    ]
    const updatedContact: Contact = {
      ...contactA,
      status: 'ARCHIVED'
    }

    vi.mocked(applicationsApi.createAdminCandidate).mockResolvedValue(createdApplication)
    vi.mocked(applicationsApi.updateAdminCandidate).mockResolvedValue(candidateUpdatedApplications)
    vi.mocked(applicationsApi.updateApplicationStatus).mockResolvedValue(updatedApplication)
    vi.mocked(applicationsApi.deleteApplication).mockResolvedValue()
    vi.mocked(contactsApi.updateContactStatus).mockResolvedValue(updatedContact)
    vi.mocked(contactsApi.deleteContact).mockResolvedValue()

    const { result } = renderHook(() => useAdminDashboard())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createCandidate({
        candidateName: createdApplication.candidateName,
        email: createdApplication.email,
        phone: createdApplication.phone,
        notes: 'Contacto manual'
      })
    })
    expect(result.current.applications[0].id).toBe('a3')

    await act(async () => {
      await result.current.updateCandidate('a1', {
        candidateName: 'Maxi Perlo',
        email: 'maxi.perlo@example.com',
        phone: '+549351000000'
      })
    })
    expect(result.current.applications.find((a) => a.id === 'a1')).toMatchObject({
      candidateName: 'Maxi Perlo',
      email: 'maxi.perlo@example.com',
      phone: '+549351000000'
    })

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

  it('ignora respuestas viejas cuando dos recargas compiten entre sí', async () => {
    const firstVacancies = createDeferred<Vacancy[]>()
    const firstApplications = createDeferred<Application[]>()
    const firstContacts = createDeferred<Contact[]>()
    const secondVacancies = createDeferred<Vacancy[]>()
    const secondApplications = createDeferred<Application[]>()
    const secondContacts = createDeferred<Contact[]>()

    vi.mocked(vacanciesApi.getVacancies)
      .mockReturnValueOnce(firstVacancies.promise)
      .mockReturnValueOnce(secondVacancies.promise)
    vi.mocked(applicationsApi.getApplications)
      .mockReturnValueOnce(firstApplications.promise)
      .mockReturnValueOnce(secondApplications.promise)
    vi.mocked(contactsApi.getContacts)
      .mockReturnValueOnce(firstContacts.promise)
      .mockReturnValueOnce(secondContacts.promise)

    const { result } = renderHook(() => useAdminDashboard())

    await act(async () => {
      void result.current.fetchDashboardData()
    })

    await act(async () => {
      secondVacancies.resolve([vacancyB])
      secondApplications.resolve([applicationB])
      secondContacts.resolve([contactB])
      await Promise.all([secondVacancies.promise, secondApplications.promise, secondContacts.promise])
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.vacancies).toEqual([vacancyB])
    expect(result.current.applications).toEqual([applicationB])
    expect(result.current.contacts).toEqual([contactB])

    await act(async () => {
      firstVacancies.resolve([vacancyA, vacancyB])
      firstApplications.resolve([applicationA, applicationB])
      firstContacts.resolve([contactA, contactB])
      await Promise.all([firstVacancies.promise, firstApplications.promise, firstContacts.promise])
    })

    expect(result.current.vacancies).toEqual([vacancyB])
    expect(result.current.applications).toEqual([applicationB])
    expect(result.current.contacts).toEqual([contactB])
  })
})
