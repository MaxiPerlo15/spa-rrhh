import { useMemo } from 'react'
import Pagination from '@/components/Pagination'
import type { Application } from '@/lib/api/applications'
import type { Vacancy } from '@/lib/api/vacancies'

interface AdminApplicationsSectionProps {
  applications: Application[]
  vacancies: Vacancy[]
  filteredApplications: Application[]
  paginatedApplications: Application[]
  currentApplicationPage: number
  itemsPerPage: number
  setCurrentApplicationPage: (page: number) => void
  searchApplications: string
  setSearchApplications: (value: string) => void
  filterStatus: string
  setFilterStatus: (value: string) => void
  filterApplicationsVacancyId: string
  setFilterApplicationsVacancyId: (value: string) => void
  sortApplicationsBy: 'submittedAt' | 'candidateName' | 'status'
  setSortApplicationsBy: (value: 'submittedAt' | 'candidateName' | 'status') => void
  sortApplicationsDirection: 'asc' | 'desc'
  setSortApplicationsDirection: (value: 'asc' | 'desc') => void
  firstApplicationId: string | null
  firstApplicationWithCvId: string | null
  getTourClass: (key: 'applications-filters' | 'application-view-btn' | 'application-cv-btn') => string
  onStatusChange: (applicationId: string, newStatus: Application['status']) => void
  onViewDetails: (application: Application) => void
  onDownloadCv: (application: Application) => void
  onDeleteApplication: (applicationId: string, candidateName: string) => void
  pendingApplicationStatusId: string | null
  pendingDeleteApplicationId: string | null
}

export default function AdminApplicationsSection({
  applications,
  vacancies,
  filteredApplications,
  paginatedApplications,
  currentApplicationPage,
  itemsPerPage,
  setCurrentApplicationPage,
  searchApplications,
  setSearchApplications,
  filterStatus,
  setFilterStatus,
  filterApplicationsVacancyId,
  setFilterApplicationsVacancyId,
  sortApplicationsBy,
  setSortApplicationsBy,
  sortApplicationsDirection,
  setSortApplicationsDirection,
  firstApplicationId,
  firstApplicationWithCvId,
  getTourClass,
  onStatusChange,
  onViewDetails,
  onDownloadCv,
  onDeleteApplication,
  pendingApplicationStatusId,
  pendingDeleteApplicationId
}: AdminApplicationsSectionProps) {
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    REVIEWING: 'bg-blue-100 text-blue-800',
    INTERVIEWED: 'bg-purple-100 text-purple-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800'
  }
  const applicationCounts = useMemo(
    () =>
      applications.reduce(
        (acc, application) => {
          acc[application.status] += 1
          return acc
        },
        {
          PENDING: 0,
          REVIEWING: 0,
          INTERVIEWED: 0,
          ACCEPTED: 0,
          REJECTED: 0
        } as Record<Application['status'], number>
      ),
    [applications]
  )
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="ds-surface p-4 bg-yellow-50 border-yellow-200">
          <div className="text-xs font-medium text-yellow-700 mb-1">Pendientes</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-800">{applicationCounts.PENDING}</div>
        </div>
        <div className="ds-surface p-4 bg-blue-50 border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-1">En Revisión</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-800">{applicationCounts.REVIEWING}</div>
        </div>
        <div className="ds-surface p-4 bg-purple-50 border-purple-200">
          <div className="text-xs font-medium text-purple-700 mb-1">Entrevistados</div>
          <div className="text-xl sm:text-2xl font-bold text-purple-800">{applicationCounts.INTERVIEWED}</div>
        </div>
        <div className="ds-surface p-4 bg-green-50 border-green-200">
          <div className="text-xs font-medium text-green-700 mb-1">Aceptados</div>
          <div className="text-xl sm:text-2xl font-bold text-green-800">{applicationCounts.ACCEPTED}</div>
        </div>
        <div className="ds-surface p-4 bg-red-50 border-red-200">
          <div className="text-xs font-medium text-red-700 mb-1">Rechazados</div>
          <div className="text-xl sm:text-2xl font-bold text-red-800">{applicationCounts.REJECTED}</div>
        </div>
      </div>

      <div data-tour="applications-filters" className={`ds-surface p-4 mb-6 ${getTourClass('applications-filters')}`}>
        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, email o vacante..."
              value={searchApplications}
              onChange={(e) => setSearchApplications(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <label className="text-sm font-medium text-gray-700 sm:shrink-0">Filtrar por estado:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full sm:w-auto sm:min-w-[165px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="all">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="REVIEWING">En Revisión</option>
              <option value="INTERVIEWED">Entrevistados</option>
              <option value="ACCEPTED">Aceptados</option>
              <option value="REJECTED">Rechazados</option>
            </select>
            <select value={filterApplicationsVacancyId} onChange={(event) => setFilterApplicationsVacancyId(event.target.value)} className="w-full sm:w-auto sm:min-w-[190px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="all">Todas las vacantes</option>
              {vacancies.map((vacancy) => (
                <option key={vacancy.id} value={vacancy.id}>{vacancy.title}</option>
              ))}
            </select>
            <select value={sortApplicationsBy} onChange={(event) => setSortApplicationsBy(event.target.value as 'submittedAt' | 'candidateName' | 'status')} className="w-full sm:w-auto sm:min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="submittedAt">Ordenar por fecha</option>
              <option value="candidateName">Ordenar por candidato</option>
              <option value="status">Ordenar por estado</option>
            </select>
            <select value={sortApplicationsDirection} onChange={(event) => setSortApplicationsDirection(event.target.value as 'asc' | 'desc')} className="w-full sm:w-auto sm:min-w-[160px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900">
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
            <span className="text-sm text-gray-600 text-center whitespace-nowrap sm:basis-full sm:text-left md:basis-auto md:ml-auto">{filteredApplications.length} postulaciones</span>
          </div>
        </div>
      </div>

      <div className="ds-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vacante</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
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
                paginatedApplications.map((application) => {
                  const isStatusUpdating = pendingApplicationStatusId === application.id
                  const isDeleting = pendingDeleteApplicationId === application.id
                  const isRowBusy = isStatusUpdating || isDeleting
                  return (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{application.candidateName}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{application.email}</td>
                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">{application.vacancy.title}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <select disabled={isRowBusy} value={application.status} onChange={(e) => onStatusChange(application.id, e.target.value as Application['status'])} className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${statusColors[application.status]}`}>
                        <option value="PENDING">Pendiente</option>
                        <option value="REVIEWING">En Revisión</option>
                        <option value="INTERVIEWED">Entrevistado</option>
                        <option value="ACCEPTED">Aceptado</option>
                        <option value="REJECTED">Rechazado</option>
                      </select>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(application.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-right">
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
                        <button disabled={isRowBusy} data-tour={application.id === firstApplicationId ? 'application-view-btn' : undefined} onClick={() => onViewDetails(application)} className={`text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${application.id === firstApplicationId ? getTourClass('application-view-btn') : ''}`}>
                          👁️ Ver
                        </button>
                        {application.resumeUrl && (
                          <button disabled={isRowBusy} data-tour={application.id === firstApplicationWithCvId ? 'application-cv-btn' : undefined} onClick={() => onDownloadCv(application)} className={`text-green-600 hover:text-green-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${application.id === firstApplicationWithCvId ? getTourClass('application-cv-btn') : ''}`}>
                            📄 CV
                          </button>
                        )}
                        <button
                          disabled={isRowBusy}
                          onClick={() => onDeleteApplication(application.id, application.candidateName)}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? 'Eliminando...' : '🗑️ Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentApplicationPage} totalItems={filteredApplications.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentApplicationPage} />
      </div>
    </>
  )
}
