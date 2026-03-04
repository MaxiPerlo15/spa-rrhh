// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminVacanciesSection from '@/components/admin/sections/AdminVacanciesSection'
import AdminApplicationsSection from '@/components/admin/sections/AdminApplicationsSection'
import AdminContactsSection from '@/components/admin/sections/AdminContactsSection'
import type { Vacancy } from '@/lib/api/vacancies'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'

const getVacancyTourClass: (key: 'create-vacancy' | 'vacancy-toggle-btn' | 'vacancy-edit-btn' | 'vacancy-delete-btn') => string = () => ''
const getApplicationTourClass: (key: 'applications-filters' | 'application-view-btn' | 'application-cv-btn') => string = () => ''
const getContactTourClass: (key: 'contacts-table' | 'contact-view-btn') => string = () => ''

describe('Acciones admin con etiquetas accesibles contextuales', () => {
  it('vacantes: acciones exponen labels contextuales', () => {
    const vacancy: Vacancy = {
      id: 'vac-1',
      title: 'Desarrollador Frontend',
      location: 'Córdoba',
      workday: 'FULL_TIME',
      modality: 'REMOTE',
      status: 'active',
      createdAt: new Date().toISOString()
    }

    render(
      <AdminVacanciesSection
        filteredVacancies={[vacancy]}
        paginatedVacancies={[vacancy]}
        currentVacancyPage={1}
        itemsPerPage={10}
        setCurrentVacancyPage={vi.fn<(page: number) => void>()}
        searchVacancies=""
        setSearchVacancies={vi.fn<(value: string) => void>()}
        filterVacancyStatus="all"
        setFilterVacancyStatus={vi.fn<(value: 'all' | 'active' | 'closed') => void>()}
        sortVacanciesBy="createdAt"
        setSortVacanciesBy={vi.fn<(value: 'createdAt' | 'title' | 'location' | 'status') => void>()}
        sortVacanciesDirection="desc"
        setSortVacanciesDirection={vi.fn<(value: 'asc' | 'desc') => void>()}
        getTourClass={getVacancyTourClass}
        onOpenCreateModal={vi.fn<() => void>()}
        onToggleStatus={vi.fn<(vacancy: Vacancy) => void>()}
        onOpenEditModal={vi.fn<(vacancy: Vacancy) => void>()}
        onDeleteVacancy={vi.fn<(id: string, title: string) => void>()}
        pendingToggleVacancyId={null}
        pendingDeleteVacancyId={null}
      />
    )

    expect(screen.getAllByRole('button', { name: 'Cerrar vacante Desarrollador Frontend' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Editar vacante Desarrollador Frontend' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Eliminar vacante Desarrollador Frontend' }).length).toBeGreaterThan(0)
  })

  it('postulaciones: acciones Ver/Eliminar tienen labels contextuales', () => {
    const application: Application = {
      id: 'app-1',
      candidateName: 'Maxi Perlo',
      email: 'maxi@spa.com',
      phone: '3510000000',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      resumeUrl: 'https://example.com/cv.pdf',
      vacancy: { id: 'vac-1', title: 'Diseñador UX' }
    }

    render(
      <AdminApplicationsSection
        applications={[application]}
        vacancies={[{ id: 'vac-1', title: 'Diseñador UX', location: 'Córdoba', workday: 'FULL_TIME', modality: 'REMOTE', status: 'active', createdAt: new Date().toISOString() }]}
        filteredApplications={[application]}
        paginatedApplications={[application]}
        currentApplicationPage={1}
        itemsPerPage={10}
        setCurrentApplicationPage={vi.fn<(page: number) => void>()}
        searchApplications=""
        setSearchApplications={vi.fn<(value: string) => void>()}
        filterStatus="all"
        setFilterStatus={vi.fn<(value: string) => void>()}
        filterApplicationsVacancyId="all"
        setFilterApplicationsVacancyId={vi.fn<(value: string) => void>()}
        sortApplicationsBy="submittedAt"
        setSortApplicationsBy={vi.fn<(value: 'submittedAt' | 'candidateName' | 'status') => void>()}
        sortApplicationsDirection="desc"
        setSortApplicationsDirection={vi.fn<(value: 'asc' | 'desc') => void>()}
        firstApplicationId={null}
        firstApplicationWithCvId={null}
        getTourClass={getApplicationTourClass}
        onStatusChange={vi.fn<(applicationId: string, newStatus: Application['status']) => void>()}
        onViewDetails={vi.fn<(application: Application) => void>()}
        onDownloadCv={vi.fn<(application: Application) => void>()}
        onDeleteApplication={vi.fn<(applicationId: string, candidateName: string) => void>()}
        pendingApplicationStatusId={null}
        pendingDeleteApplicationId={null}
        onExportCsv={vi.fn<() => void>()}
        isExportingCsv={false}
      />
    )

    expect(screen.getAllByRole('button', { name: 'Ver detalle de postulación de Maxi Perlo' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Eliminar postulación de Maxi Perlo' }).length).toBeGreaterThan(0)
  })

  it('contactos: acciones Ver/Eliminar tienen labels contextuales', () => {
    const contact: Contact = {
      id: 'c-1',
      name: 'Laura Gomez',
      email: 'laura@empresa.com',
      phone: '3511111111',
      subject: 'Consulta',
      message: 'Hola',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }

    render(
      <AdminContactsSection
        contacts={[contact]}
        filteredContacts={[contact]}
        paginatedContacts={[contact]}
        currentContactPage={1}
        itemsPerPage={10}
        setCurrentContactPage={vi.fn<(page: number) => void>()}
        searchContacts=""
        setSearchContacts={vi.fn<(value: string) => void>()}
        filterContactStatus="all"
        setFilterContactStatus={vi.fn<(value: string) => void>()}
        sortContactsBy="createdAt"
        setSortContactsBy={vi.fn<(value: 'createdAt' | 'name' | 'status') => void>()}
        sortContactsDirection="desc"
        setSortContactsDirection={vi.fn<(value: 'asc' | 'desc') => void>()}
        firstContactId={null}
        getTourClass={getContactTourClass}
        onStatusChange={vi.fn<(contactId: string, newStatus: Contact['status']) => void>()}
        onViewDetails={vi.fn<(contact: Contact) => void>()}
        onDeleteContact={vi.fn<(contactId: string, contactName: string) => void>()}
        pendingContactStatusId={null}
        pendingDeleteContactId={null}
      />
    )

    expect(screen.getAllByRole('button', { name: 'Ver detalle de contacto de Laura Gomez' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Eliminar contacto de Laura Gomez' }).length).toBeGreaterThan(0)
  })
})
