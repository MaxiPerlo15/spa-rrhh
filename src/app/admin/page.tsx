'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Pagination from '@/components/Pagination'
import { useToast } from '@/contexts/ToastContext'
import ConfirmDialog from '@/components/ConfirmDialog'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs'
import DashboardStats from '@/components/admin/DashboardStats'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import type { Vacancy } from '@/lib/api/vacancies'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import * as Sentry from '@sentry/nextjs'


export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  
  // Usar el hook customizado para manejar datos y operaciones
  const {
    vacancies,
    applications,
    contacts,
    stats,
    isLoading,
    createVacancy: createVacancyApi,
    updateVacancy: updateVacancyApi,
    deleteVacancy: deleteVacancyApi,
    toggleVacancyStatus,
    updateApplicationStatus,
    updateContactStatus,
    deleteContact: deleteContactApi
  } = useAdminDashboard()
  
  const [activeTab, setActiveTab] = useState<AdminTab>('vacancies')
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [filterContactStatus, setFilterContactStatus] = useState<string>('all')
  const [searchApplications, setSearchApplications] = useState<string>('')
  const [searchContacts, setSearchContacts] = useState<string>('')
  const [currentVacancyPage, setCurrentVacancyPage] = useState(1)
  const [currentApplicationPage, setCurrentApplicationPage] = useState(1)
  const [currentContactPage, setCurrentContactPage] = useState(1)
  const itemsPerPage = 10
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showContactDetail, setShowContactDetail] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    type?: 'danger' | 'warning' | 'info'
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    workday: 'FULL_TIME',
    modality: 'ON_SITE',
    salary: '',
    requirements: '',
    benefits: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/signin')
    }
  }, [status, router])

  useEffect(() => {
    let filtered = applications

    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(app => app.status === filterStatus)
    }

    // Filtro por búsqueda
    if (searchApplications.trim()) {
      const search = searchApplications.toLowerCase()
      filtered = filtered.filter(app =>
        app.candidateName.toLowerCase().includes(search) ||
        app.email.toLowerCase().includes(search) ||
        app.vacancy.title.toLowerCase().includes(search)
      )
    }

    setFilteredApplications(filtered)
  }, [filterStatus, searchApplications, applications])

  useEffect(() => {
    let filtered = contacts

    // Filtro por estado
    if (filterContactStatus !== 'all') {
      filtered = filtered.filter(contact => contact.status === filterContactStatus)
    }

    // Filtro por búsqueda
    if (searchContacts.trim()) {
      const search = searchContacts.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(search) ||
        contact.email.toLowerCase().includes(search) ||
        contact.subject.toLowerCase().includes(search)
      )
    }

    setFilteredContacts(filtered)
  }, [filterContactStatus, searchContacts, contacts])

  // Resetear páginas cuando cambian los filtros
  useEffect(() => {
    setCurrentApplicationPage(1)
  }, [filterStatus, searchApplications])

  useEffect(() => {
    setCurrentContactPage(1)
  }, [filterContactStatus, searchContacts])

  const handleDeleteVacancy = async (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Eliminar Vacante',
      message: `¿Estás seguro de eliminar la vacante "${title}"?\n\nEsta acción también eliminará todas las postulaciones asociadas y no se puede deshacer.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteVacancyApi(id)
          showSuccess('Vacante eliminada exitosamente')
        } catch (error) {
          console.error('Error deleting vacancy:', error)
          showError('Error al eliminar la vacante')
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const handleStatusToggle = async (vacancy: Vacancy) => {
    try {
      await toggleVacancyStatus(vacancy)
      showSuccess(`Vacante ${vacancy.status === 'active' ? 'cerrada' : 'activada'} exitosamente`)
    } catch (error) {
      console.error('Error toggling status:', error)
      showError('Error al cambiar el estado de la vacante')
    }
  }

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      workday: 'FULL_TIME',
      modality: 'ON_SITE',
      salary: '',
      requirements: '',
      benefits: ''
    })
    setEditingVacancy(null)
    setShowCreateModal(true)
  }

  const handleOpenEditModal = (vacancy: Vacancy) => {
    setFormData({
      title: vacancy.title,
      description: vacancy.description || '',
      location: vacancy.location,
      workday: vacancy.workday,
      modality: vacancy.modality,
      salary: '',
      requirements: '',
      benefits: ''
    })
    setEditingVacancy(vacancy)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingVacancy(null)
    setFormData({
      title: '',
      description: '',
      location: '',
      workday: 'FULL_TIME',
      modality: 'ON_SITE',
      salary: '',
      requirements: '',
      benefits: ''
    })
  }

  const handleSubmitVacancy = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (editingVacancy) {
        await updateVacancyApi(editingVacancy.id, formData)
        showSuccess('Vacante actualizada exitosamente')
      } else {
        await createVacancyApi(formData)
        showSuccess('Vacante creada exitosamente')
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving vacancy:', error)
      showError(error instanceof Error ? error.message : 'Error al guardar la vacante')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (applicationId: string, newStatus: Application['status']) => {
    try {
      await updateApplicationStatus(applicationId, newStatus)
      showSuccess('Estado actualizado exitosamente')
    } catch (error) {
      console.error('Error updating application status:', error)
      showError('Error al actualizar el estado')
    }
  }

  const handleDownloadCV = (application: Application) => {
    if (!application.resumeUrl) {
      showError('No hay CV disponible para esta postulación')
      return
    }

    const link = document.createElement('a')
    link.href = application.resumeUrl
    link.download = application.resumeFileName || `CV-${application.candidateName}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewApplicationDetails = (application: Application) => {
    setSelectedApplication(application)
    setShowApplicationDetail(true)
  }

  const handleContactStatusChange = async (contactId: string, newStatus: Contact['status']) => {
    try {
      await updateContactStatus(contactId, newStatus)
      showSuccess('Estado del contacto actualizado')
    } catch (error) {
      console.error('Error al actualizar estado del contacto:', error)
      showError('Error al actualizar el estado del contacto')
    }
  }

  const handleViewContactDetails = (contact: Contact) => {
    setSelectedContact(contact)
    setShowContactDetail(true)
  }

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Eliminar Contacto',
      message: `¿Estás seguro de eliminar el contacto de "${contactName}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteContactApi(contactId)
          showSuccess('Contacto eliminado exitosamente')
        } catch (error) {
          console.error('Error al eliminar contacto:', error)
          showError('Error al eliminar el contacto')
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }

  const contactStatusLabels = {
    'PENDING': 'Pendiente',
    'RESPONDED': 'Respondido',
    'ARCHIVED': 'Archivado'
  }

  const contactStatusColors = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'RESPONDED': 'bg-green-100 text-green-800',
    'ARCHIVED': 'bg-gray-100 text-gray-800'
  }

const handleTestSentry = () => {
  try {
    throw new Error('Test Error - Sentry está funcionando correctamente')
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        component: 'AdminDashboard',
        user_role: 'admin'
      },
      extra: {
        timestamp: new Date().toISOString(),
        userEmail: session?.user?.email,
        totalVacancies: stats.totalVacancies,
        totalApplications: stats.totalApplications
      },
      level: 'info'
    })
    showSuccess('Error de prueba enviado a Sentry. Revisa tu dashboard en Sentry.io')
  }
}

  const statusLabels = {
    'PENDING': 'Pendiente',
    'REVIEWING': 'En Revisión',
    'INTERVIEWED': 'Entrevistado',
    'ACCEPTED': 'Aceptado',
    'REJECTED': 'Rechazado'
  }

  const statusColors = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'REVIEWING': 'bg-blue-100 text-blue-800',
    'INTERVIEWED': 'bg-purple-100 text-purple-800',
    'ACCEPTED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        userEmail={session.user?.email ?? undefined}
        onSignOut={() => signOut({ callbackUrl: '/' })}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats
          totalVacancies={stats.totalVacancies}
          activeVacancies={stats.activeVacancies}
          totalApplications={stats.totalApplications}
          pendingContacts={stats.pendingContacts}
        />

        {/* Botón de Test de Sentry - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Test de Monitoreo</h3>
                  <p className="text-xs text-blue-700">Verifica que Sentry esté capturando errores correctamente</p>
                </div>
              </div>
              <button
                onClick={handleTestSentry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🧪 Probar Sentry
              </button>
            </div>
          </div>
        )}

        <AdminTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={{
            activeVacancies: stats.activeVacancies,
            pendingApplications: applications.filter(a => a.status === 'PENDING').length,
            pendingContacts: stats.pendingContacts
          }}
        />

        {/* Vacancies Tab */}
        {activeTab === 'vacancies' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestión de Vacantes</h2>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              + Nueva Vacante
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jornada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modalidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vacancies
                  .slice((currentVacancyPage - 1) * itemsPerPage, currentVacancyPage * itemsPerPage)
                  .map((vacancy) => {
                  const workdayLabels = {
                    'FULL_TIME': 'Jornada Completa',
                    'PART_TIME': 'Media Jornada',
                    'PROJECT_BASED': 'Por Proyecto',
                    'INTERNSHIP': 'Pasantía'
                  }
                  const modalityLabels = {
                    'ON_SITE': 'Presencial',
                    'REMOTE': 'Remoto',
                    'HYBRID': 'Híbrido'
                  }
                  return (
                  <tr key={vacancy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{vacancy.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vacancy.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {workdayLabels[vacancy.workday as keyof typeof workdayLabels] || vacancy.workday}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {modalityLabels[vacancy.modality as keyof typeof modalityLabels] || vacancy.modality}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vacancy.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vacancy.status === 'active' ? 'Activa' : 'Cerrada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(vacancy.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button
                        onClick={() => handleStatusToggle(vacancy)}
                        className={`${
                          vacancy.status === 'active' 
                            ? 'text-orange-600 hover:text-orange-800' 
                            : 'text-green-600 hover:text-green-800'
                        } font-medium`}
                        title={vacancy.status === 'active' ? 'Cerrar esta vacante (no aparecerá en la página pública)' : 'Activar esta vacante (aparecerá en la página pública)'}
                      >
                        {vacancy.status === 'active' ? '🔒 Cerrar' : '✅ Activar'}
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(vacancy)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDeleteVacancy(vacancy.id, vacancy.title)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                )})
                }
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          <Pagination
            currentPage={currentVacancyPage}
            totalItems={vacancies.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentVacancyPage}
          />
        </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <>
            {/* Stats pequeñas para applications */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-200">
                <div className="text-xs font-medium text-yellow-700 mb-1">Pendientes</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {applications.filter(a => a.status === 'PENDING').length}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-200">
                <div className="text-xs font-medium text-blue-700 mb-1">En Revisión</div>
                <div className="text-2xl font-bold text-blue-800">
                  {applications.filter(a => a.status === 'REVIEWING').length}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg shadow-sm p-4 border border-purple-200">
                <div className="text-xs font-medium text-purple-700 mb-1">Entrevistados</div>
                <div className="text-2xl font-bold text-purple-800">
                  {applications.filter(a => a.status === 'INTERVIEWED').length}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-200">
                <div className="text-xs font-medium text-green-700 mb-1">Aceptados</div>
                <div className="text-2xl font-bold text-green-800">
                  {applications.filter(a => a.status === 'ACCEPTED').length}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg shadow-sm p-4 border border-red-200">
                <div className="text-xs font-medium text-red-700 mb-1">Rechazados</div>
                <div className="text-2xl font-bold text-red-800">
                  {applications.filter(a => a.status === 'REJECTED').length}
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col gap-4">
                {/* Búsqueda */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o vacante..."
                    value={searchApplications}
                    onChange={(e) => setSearchApplications(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="REVIEWING">En Revisión</option>
                    <option value="INTERVIEWED">Entrevistados</option>
                    <option value="ACCEPTED">Aceptados</option>
                    <option value="REJECTED">Rechazados</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    {filteredApplications.length} postulaciones
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de postulaciones */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vacante</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No hay postulaciones {filterStatus !== 'all' ? 'con este estado' : 'disponibles'}
                        </td>
                      </tr>
                    ) : (
                      filteredApplications
                        .slice((currentApplicationPage - 1) * itemsPerPage, currentApplicationPage * itemsPerPage)
                        .map((application) => (
                        <tr key={application.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {application.candidateName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{application.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{application.vacancy.title}</td>
                          <td className="px-6 py-4 text-sm">
                            <select
                              value={application.status}
                              onChange={(e) => handleStatusChange(application.id, e.target.value as Application['status'])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[application.status]}`}
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="REVIEWING">En Revisión</option>
                              <option value="INTERVIEWED">Entrevistado</option>
                              <option value="ACCEPTED">Aceptado</option>
                              <option value="REJECTED">Rechazado</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right space-x-2">
                            <button
                              onClick={() => handleViewApplicationDetails(application)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              👁️ Ver
                            </button>
                            {application.resumeUrl && (
                              <button
                                onClick={() => handleDownloadCV(application)}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                📄 CV
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              <Pagination
                currentPage={currentApplicationPage}
                totalItems={filteredApplications.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentApplicationPage}
              />
            </div>
          </>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <>
            {/* Stats pequeñas para contactos */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-yellow-50 rounded-lg shadow-sm p-4 border border-yellow-200">
                <div className="text-xs font-medium text-yellow-700 mb-1">Pendientes</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {contacts.filter(c => c.status === 'PENDING').length}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-200">
                <div className="text-xs font-medium text-green-700 mb-1">Respondidos</div>
                <div className="text-2xl font-bold text-green-800">
                  {contacts.filter(c => c.status === 'RESPONDED').length}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">Archivados</div>
                <div className="text-2xl font-bold text-gray-800">
                  {contacts.filter(c => c.status === 'ARCHIVED').length}
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col gap-4">
                {/* Búsqueda */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o asunto..."
                    value={searchContacts}
                    onChange={(e) => setSearchContacts(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Filtrar por estado:</label>
                  <select
                    value={filterContactStatus}
                    onChange={(e) => setFilterContactStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  >
                    <option value="all">Todos</option>
                    <option value="PENDING">Pendientes</option>
                    <option value="RESPONDED">Respondidos</option>
                    <option value="ARCHIVED">Archivados</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    {filteredContacts.length} contactos
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de contactos */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No hay contactos {filterContactStatus !== 'all' ? 'con este estado' : 'disponibles'}
                        </td>
                      </tr>
                    ) : (
                      filteredContacts
                        .slice((currentContactPage - 1) * itemsPerPage, currentContactPage * itemsPerPage)
                        .map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {contact.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{contact.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {contact.subject}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <select
                              value={contact.status}
                              onChange={(e) => handleContactStatusChange(contact.id, e.target.value as Contact['status'])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${contactStatusColors[contact.status]}`}
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="RESPONDED">Respondido</option>
                              <option value="ARCHIVED">Archivado</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(contact.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right space-x-2">
                            <button
                              onClick={() => handleViewContactDetails(contact)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              👁️ Ver
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id, contact.name)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              <Pagination
                currentPage={currentContactPage}
                totalItems={filteredContacts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentContactPage}
              />
            </div>
          </>
        )}
      </main>

      {/* Contact Detail Modal */}
      {showContactDetail && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedContact.name}
                  </h3>
                  <p className="text-gray-600">{selectedContact.email}</p>
                </div>
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Información de contacto */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <p className="text-gray-900">{selectedContact.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Asunto</label>
                  <p className="text-gray-900">{selectedContact.subject}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${contactStatusColors[selectedContact.status]}`}>
                    {contactStatusLabels[selectedContact.status]}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                  <p className="text-gray-900">
                    {new Date(selectedContact.createdAt).toLocaleString('es-AR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              {/* Mensaje */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mensaje</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-line">{selectedContact.message}</p>
                </div>
              </div>

              {/* Botón para contactar */}
              <div className="mb-6">
                <a
                  href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject}`}
                  className="w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  📧 Responder por Email
                </a>
              </div>

              {/* Cambiar estado */}
              <div className="border-t pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cambiar Estado</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'PENDING')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'RESPONDED')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium"
                  >
                    ✅ Respondido
                  </button>
                  <button
                    onClick={() => {
                      handleContactStatusChange(selectedContact.id, 'ARCHIVED')
                      setShowContactDetail(false)
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    📦 Archivar
                  </button>
                </div>
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {showApplicationDetail && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedApplication.candidateName}
                  </h3>
                  <p className="text-gray-600">
                    Postulación para: <span className="font-semibold text-primary-500">{selectedApplication.vacancy.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowApplicationDetail(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Información de contacto */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedApplication.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <p className="text-gray-900">{selectedApplication.phone || 'No proporcionado'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedApplication.status]}`}>
                    {statusLabels[selectedApplication.status]}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Postulación</label>
                  <p className="text-gray-900">
                    {new Date(selectedApplication.submittedAt).toLocaleString('es-AR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              {/* Carta de presentación */}
              {selectedApplication.coverLetter && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Carta de Presentación</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-900 whitespace-pre-line">{selectedApplication.coverLetter}</p>
                  </div>
                </div>
              )}

              {/* CV */}
              {selectedApplication.resumeUrl && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Curriculum Vitae</label>
                  <button
                    onClick={() => handleDownloadCV(selectedApplication)}
                    className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    📄 Descargar {selectedApplication.resumeFileName || 'CV'}
                  </button>
                </div>
              )}

              {/* Cambiar estado */}
              <div className="border-t pt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cambiar Estado</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'PENDING')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                  >
                    Pendiente
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'REVIEWING')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    En Revisión
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'INTERVIEWED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                  >
                    Entrevistado
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'ACCEPTED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors font-medium"
                  >
                    ✅ Aceptar
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedApplication.id, 'REJECTED')
                      setShowApplicationDetail(false)
                    }}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    ❌ Rechazar
                  </button>
                  <button
                    onClick={() => setShowApplicationDetail(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmitVacancy} className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingVacancy ? 'Editar Vacante' : 'Nueva Vacante'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título de la vacante *
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Desarrollador Full Stack"
                  />
                </div>

                {/* Ubicación, Jornada y Modalidad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación *
                    </label>
                    <input
                      type="text"
                      id="location"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                      placeholder="Ej: Las Varillas, Córdoba"
                    />
                  </div>

                  <div>
                    <label htmlFor="workday" className="block text-sm font-medium text-gray-700 mb-1">
                      Jornada *
                    </label>
                    <select
                      id="workday"
                      required
                      value={formData.workday}
                      onChange={(e) => setFormData({ ...formData, workday: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    >
                      <option value="FULL_TIME">Jornada Completa</option>
                      <option value="PART_TIME">Media Jornada</option>
                      <option value="PROJECT_BASED">Por Proyecto</option>
                      <option value="INTERNSHIP">Pasantía</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="modality" className="block text-sm font-medium text-gray-700 mb-1">
                      Modalidad *
                    </label>
                    <select
                      id="modality"
                      required
                      value={formData.modality}
                      onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    >
                      <option value="ON_SITE">Presencial</option>
                      <option value="REMOTE">Remoto</option>
                      <option value="HYBRID">Híbrido</option>
                    </select>
                  </div>
                </div>

                {/* Salario */}
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                    Salario
                  </label>
                  <input
                    type="text"
                    id="salary"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: $1,500,000 - $2,000,000 o A convenir"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Describe la vacante, responsabilidades principales, etc."
                  />
                </div>

                {/* Requisitos */}
                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                    Requisitos
                  </label>
                  <textarea
                    id="requirements"
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Experiencia, habilidades técnicas, educación requerida, etc."
                  />
                </div>

                {/* Beneficios */}
                <div>
                  <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                    Beneficios
                  </label>
                  <textarea
                    id="benefits"
                    rows={3}
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                    placeholder="Trabajo remoto, capacitaciones, días libres, etc."
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Guardando...' : (editingVacancy ? 'Actualizar' : 'Crear Vacante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  )
}
