import { useMemo } from 'react'
import Pagination from '@/components/Pagination'
import MobileFilterSheet, { type FilterOption } from '@/components/admin/mobile/MobileFilterSheet'
import MobileSwipeActionCard from '@/components/admin/mobile/MobileSwipeActionCard'
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
  const applicationStatusOptions: FilterOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'REVIEWING', label: 'En Revisión' },
    { value: 'INTERVIEWED', label: 'Entrevistados' },
    { value: 'ACCEPTED', label: 'Aceptados' },
    { value: 'REJECTED', label: 'Rechazados' }
  ]
  const applicationVacancyOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las vacantes' },
    ...vacancies.map((vacancy) => ({ value: vacancy.id, label: vacancy.title }))
  ]
  const applicationSortByOptions: FilterOption[] = [
    { value: 'submittedAt', label: 'Ordenar por fecha' },
    { value: 'candidateName', label: 'Ordenar por candidato' },
    { value: 'status', label: 'Ordenar por estado' }
  ]
  const applicationSortDirectionOptions: FilterOption[] = [
    { value: 'desc', label: 'Descendente' },
    { value: 'asc', label: 'Ascendente' }
  ]
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

          <div className="md:hidden flex flex-col items-stretch gap-3">
            <MobileFilterSheet
              label="Filtrar postulaciones por estado"
              value={filterStatus}
              options={applicationStatusOptions}
              onChange={setFilterStatus}
              ariaLabel="Filtrar postulaciones por estado"
            />
            <MobileFilterSheet
              label="Filtrar por vacante"
              value={filterApplicationsVacancyId}
              options={applicationVacancyOptions}
              onChange={setFilterApplicationsVacancyId}
              ariaLabel="Filtrar postulaciones por vacante"
            />
            <MobileFilterSheet
              label="Ordenar postulaciones por"
              value={sortApplicationsBy}
              options={applicationSortByOptions}
              onChange={(nextValue) => setSortApplicationsBy(nextValue as 'submittedAt' | 'candidateName' | 'status')}
              ariaLabel="Ordenar postulaciones por"
            />
            <MobileFilterSheet
              label="Dirección de orden"
              value={sortApplicationsDirection}
              options={applicationSortDirectionOptions}
              onChange={(nextValue) => setSortApplicationsDirection(nextValue as 'asc' | 'desc')}
              ariaLabel="Seleccionar dirección de orden de postulaciones"
            />
            <span className="text-sm text-gray-600 text-center whitespace-nowrap">{filteredApplications.length} postulaciones</span>
          </div>

          <div className="hidden md:flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
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
        <div className="md:hidden p-4 space-y-3">
          {paginatedApplications.length > 0 && (
            <p className="text-xs text-gray-500">Desliza cada postulación hacia la izquierda para acciones rápidas.</p>
          )}
          {filteredApplications.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No hay postulaciones {filterStatus !== 'all' ? 'con este estado' : 'disponibles'}
            </div>
          ) : (
            paginatedApplications.map((application) => {
              const isStatusUpdating = pendingApplicationStatusId === application.id
              const isDeleting = pendingDeleteApplicationId === application.id
              const isRowBusy = isStatusUpdating || isDeleting

              return (
                <MobileSwipeActionCard
                  key={application.id}
                  actions={[
                    {
                      key: 'view',
                      label: 'Ver',
                      ariaLabel: `Ver detalle de postulación de ${application.candidateName}`,
                      onClick: () => onViewDetails(application),
                      className: 'bg-blue-600',
                      disabled: isRowBusy
                    },
                    ...(application.resumeUrl
                      ? [
                          {
                            key: 'cv',
                            label: 'CV',
                            ariaLabel: `Descargar CV de ${application.candidateName}`,
                            onClick: () => onDownloadCv(application),
                            className: 'bg-green-600',
                            disabled: isRowBusy
                          }
                        ]
                      : []),
                    {
                      key: 'delete',
                      label: isDeleting ? '...' : 'Eliminar',
                      ariaLabel: `Eliminar postulación de ${application.candidateName}`,
                      onClick: () => onDeleteApplication(application.id, application.candidateName),
                      className: 'bg-red-600',
                      disabled: isRowBusy
                    }
                  ]}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{application.candidateName}</h3>
                        <p className="text-xs text-gray-600">{application.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[application.status]}`}>
                        {application.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium text-gray-700">Vacante:</span> {application.vacancy.title}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Fecha:</span>{' '}
                        {new Date(application.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <select
                        disabled={isRowBusy}
                        value={application.status}
                        onChange={(event) => onStatusChange(application.id, event.target.value as Application['status'])}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-0 disabled:opacity-60 disabled:cursor-not-allowed ${statusColors[application.status]}`}
                      >
                        <option value="PENDING">Pendiente</option>
                        <option value="REVIEWING">En Revisión</option>
                        <option value="INTERVIEWED">Entrevistado</option>
                        <option value="ACCEPTED">Aceptado</option>
                        <option value="REJECTED">Rechazado</option>
                      </select>
                      <button
                        data-tour={application.id === firstApplicationId ? 'application-view-btn' : undefined}
                        type="button"
                        disabled={isRowBusy}
                        onClick={() => onViewDetails(application)}
                        className={`rounded-md px-1 py-1 text-sm font-medium text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${application.id === firstApplicationId ? getTourClass('application-view-btn') : ''}`}
                        aria-label={`Ver detalle de postulación de ${application.candidateName}`}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </MobileSwipeActionCard>
              )
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
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
                        <button disabled={isRowBusy} data-tour={application.id === firstApplicationId ? 'application-view-btn' : undefined} onClick={() => onViewDetails(application)} className={`text-blue-700 hover:text-blue-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${application.id === firstApplicationId ? getTourClass('application-view-btn') : ''}`} aria-label={`Ver detalle de postulación de ${application.candidateName}`}>
                          <span aria-hidden="true">👁️ </span>Ver
                        </button>
                        {application.resumeUrl && (
                          <button disabled={isRowBusy} data-tour={application.id === firstApplicationWithCvId ? 'application-cv-btn' : undefined} onClick={() => onDownloadCv(application)} className={`text-green-700 hover:text-green-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${application.id === firstApplicationWithCvId ? getTourClass('application-cv-btn') : ''}`} aria-label={`Descargar CV de ${application.candidateName}`}>
                            <span aria-hidden="true">📄 </span>CV
                          </button>
                        )}
                        <button
                          disabled={isRowBusy}
                          onClick={() => onDeleteApplication(application.id, application.candidateName)}
                          className="text-red-700 hover:text-red-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                          aria-label={`Eliminar postulación de ${application.candidateName}`}
                        >
                          {isDeleting ? (
                            'Eliminando...'
                          ) : (
                            <>
                              <span aria-hidden="true">🗑️ </span>Eliminar
                            </>
                          )}
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
