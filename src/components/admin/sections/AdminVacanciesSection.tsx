import Pagination from '@/components/Pagination'
import MobileFilterSheet, { type FilterOption } from '@/components/admin/mobile/MobileFilterSheet'
import MobileSwipeActionCard from '@/components/admin/mobile/MobileSwipeActionCard'
import type { Vacancy } from '@/lib/api/vacancies'

interface AdminVacanciesSectionProps {
  filteredVacancies: Vacancy[]
  paginatedVacancies: Vacancy[]
  currentVacancyPage: number
  itemsPerPage: number
  setCurrentVacancyPage: (page: number) => void
  searchVacancies: string
  setSearchVacancies: (value: string) => void
  filterVacancyStatus: 'all' | 'active' | 'closed'
  setFilterVacancyStatus: (value: 'all' | 'active' | 'closed') => void
  sortVacanciesBy: 'createdAt' | 'title' | 'location' | 'status'
  setSortVacanciesBy: (value: 'createdAt' | 'title' | 'location' | 'status') => void
  sortVacanciesDirection: 'asc' | 'desc'
  setSortVacanciesDirection: (value: 'asc' | 'desc') => void
  getTourClass: (key: 'create-vacancy' | 'vacancy-toggle-btn' | 'vacancy-edit-btn' | 'vacancy-delete-btn') => string
  onOpenCreateModal: () => void
  onToggleStatus: (vacancy: Vacancy) => void
  onOpenEditModal: (vacancy: Vacancy) => void
  onDeleteVacancy: (id: string, title: string) => void
  pendingToggleVacancyId: string | null
  pendingDeleteVacancyId: string | null
}

export default function AdminVacanciesSection({
  filteredVacancies,
  paginatedVacancies,
  currentVacancyPage,
  itemsPerPage,
  setCurrentVacancyPage,
  searchVacancies,
  setSearchVacancies,
  filterVacancyStatus,
  setFilterVacancyStatus,
  sortVacanciesBy,
  setSortVacanciesBy,
  sortVacanciesDirection,
  setSortVacanciesDirection,
  getTourClass,
  onOpenCreateModal,
  onToggleStatus,
  onOpenEditModal,
  onDeleteVacancy,
  pendingToggleVacancyId,
  pendingDeleteVacancyId
}: AdminVacanciesSectionProps) {
  const workdayLabels = {
    FULL_TIME: 'Jornada Completa',
    PART_TIME: 'Media Jornada',
    PROJECT_BASED: 'Por Proyecto',
    INTERNSHIP: 'Pasantía'
  }
  const modalityLabels = {
    ON_SITE: 'Presencial',
    REMOTE: 'Remoto',
    HYBRID: 'Híbrido'
  }
  const vacancyStatusOptions: FilterOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activas' },
    { value: 'closed', label: 'Cerradas' }
  ]
  const sortVacancyByOptions: FilterOption[] = [
    { value: 'createdAt', label: 'Ordenar por fecha' },
    { value: 'title', label: 'Ordenar por título' },
    { value: 'location', label: 'Ordenar por ubicación' },
    { value: 'status', label: 'Ordenar por estado' }
  ]
  const sortVacancyDirectionOptions: FilterOption[] = [
    { value: 'desc', label: 'Más recientes primero' },
    { value: 'asc', label: 'Más antiguos primero' }
  ]

  return (
    <div className="ds-surface overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="font-display text-lg font-semibold text-gray-900">Gestión de Vacantes</h2>
        <button
          data-tour="create-vacancy"
          onClick={onOpenCreateModal}
          className={`w-full sm:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors ${getTourClass('create-vacancy')}`}
        >
          + Nueva Vacante
        </button>
      </div>
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <input
            id="admin-vacancies-search"
            name="admin_vacancies_search"
            type="text"
            autoComplete="off"
            placeholder="Buscar por título o ubicación"
            value={searchVacancies}
            onChange={(event) => setSearchVacancies(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <div className="md:hidden">
            <MobileFilterSheet
              label="Estado de vacantes"
              value={filterVacancyStatus}
              options={vacancyStatusOptions}
              onChange={(nextValue) => setFilterVacancyStatus(nextValue as 'all' | 'active' | 'closed')}
              ariaLabel="Filtrar vacantes por estado"
            />
          </div>
          <select
            id="admin-vacancies-filter-status"
            name="admin_vacancies_filter_status"
            value={filterVacancyStatus}
            onChange={(event) => setFilterVacancyStatus(event.target.value as 'all' | 'active' | 'closed')}
            className="hidden md:block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="closed">Cerradas</option>
          </select>
          <div className="md:hidden">
            <MobileFilterSheet
              label="Orden de vacantes"
              value={sortVacanciesBy}
              options={sortVacancyByOptions}
              onChange={(nextValue) => setSortVacanciesBy(nextValue as 'createdAt' | 'title' | 'location' | 'status')}
              ariaLabel="Ordenar vacantes por"
            />
          </div>
          <select
            id="admin-vacancies-sort-by"
            name="admin_vacancies_sort_by"
            value={sortVacanciesBy}
            onChange={(event) => setSortVacanciesBy(event.target.value as 'createdAt' | 'title' | 'location' | 'status')}
            className="hidden md:block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="createdAt">Ordenar por fecha</option>
            <option value="title">Ordenar por título</option>
            <option value="location">Ordenar por ubicación</option>
            <option value="status">Ordenar por estado</option>
          </select>
          <div className="md:hidden">
            <MobileFilterSheet
              label="Dirección de orden"
              value={sortVacanciesDirection}
              options={sortVacancyDirectionOptions}
              onChange={(nextValue) => setSortVacanciesDirection(nextValue as 'asc' | 'desc')}
              ariaLabel="Seleccionar dirección de orden de vacantes"
            />
          </div>
          <select
            id="admin-vacancies-sort-direction"
            name="admin_vacancies_sort_direction"
            value={sortVacanciesDirection}
            onChange={(event) => setSortVacanciesDirection(event.target.value as 'asc' | 'desc')}
            className="hidden md:block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguos primero</option>
          </select>
        </div>
      </div>

      <div className="md:hidden p-4 space-y-[18px]">
        {paginatedVacancies.length > 0 && (
          <p className="text-xs text-gray-500">Desliza cada vacante hacia la izquierda para ver acciones rápidas.</p>
        )}
        {paginatedVacancies.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No hay vacantes para los filtros actuales.
          </div>
        ) : (
          paginatedVacancies.map((vacancy, index) => {
            const isToggling = pendingToggleVacancyId === vacancy.id
            const isDeleting = pendingDeleteVacancyId === vacancy.id
            const isRowBusy = isToggling || isDeleting
            return (
              <MobileSwipeActionCard
                key={vacancy.id}
                actions={[
                  {
                    key: 'toggle',
                    label: isToggling ? 'Procesando' : vacancy.status === 'active' ? 'Cerrar' : 'Activar',
                    ariaLabel: `${vacancy.status === 'active' ? 'Cerrar' : 'Activar'} vacante ${vacancy.title}`,
                    onClick: () => onToggleStatus(vacancy),
                    className: vacancy.status === 'active' ? 'bg-orange-600' : 'bg-green-600',
                    disabled: isRowBusy
                  },
                  {
                    key: 'edit',
                    label: 'Editar',
                    ariaLabel: `Editar vacante ${vacancy.title}`,
                    onClick: () => onOpenEditModal(vacancy),
                    className: 'bg-blue-600',
                    disabled: isRowBusy
                  },
                  {
                    key: 'delete',
                    label: isDeleting ? '...' : 'Eliminar',
                    ariaLabel: `Eliminar vacante ${vacancy.title}`,
                    onClick: () => onDeleteVacancy(vacancy.id, vacancy.title),
                    className: 'bg-red-600',
                    disabled: isRowBusy
                  }
                ]}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{vacancy.title}</h3>
                      <p className="text-xs text-gray-600">{vacancy.location}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vacancy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {vacancy.status === 'active' ? 'Activa' : 'Cerrada'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium text-gray-700">Jornada:</span>{' '}
                      {workdayLabels[vacancy.workday as keyof typeof workdayLabels] || vacancy.workday}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Modalidad:</span>{' '}
                      {modalityLabels[vacancy.modality as keyof typeof modalityLabels] || vacancy.modality}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Fecha:</span>{' '}
                      {new Date(vacancy.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    data-tour={index === 0 ? 'vacancy-edit-btn' : undefined}
                    type="button"
                    onClick={() => onOpenEditModal(vacancy)}
                    className={`rounded-md px-1 py-1 text-sm font-medium text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${index === 0 ? getTourClass('vacancy-edit-btn') : ''}`}
                    disabled={isRowBusy}
                    aria-label={`Ver detalle de vacante ${vacancy.title}`}
                  >
                    Ver detalle
                  </button>
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
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
              <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jornada</th>
              <th className="hidden xl:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modalidad</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedVacancies.map((vacancy, index) => {
              const isToggling = pendingToggleVacancyId === vacancy.id
              const isDeleting = pendingDeleteVacancyId === vacancy.id
              const isRowBusy = isToggling || isDeleting
              return (
                <tr key={vacancy.id} className="hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{vacancy.title}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{vacancy.location}</td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">
                    {workdayLabels[vacancy.workday as keyof typeof workdayLabels] || vacancy.workday}
                  </td>
                  <td className="hidden xl:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">
                    {modalityLabels[vacancy.modality as keyof typeof modalityLabels] || vacancy.modality}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vacancy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vacancy.status === 'active' ? 'Activa' : 'Cerrada'}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-gray-600">
                    {new Date(vacancy.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-right">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
                      <button
                        data-tour={index === 0 ? 'vacancy-toggle-btn' : undefined}
                        onClick={() => onToggleStatus(vacancy)}
                        disabled={isRowBusy}
                        className={`${
                          vacancy.status === 'active' ? 'text-orange-700 hover:text-orange-900' : 'text-green-700 hover:text-green-900'
                        } font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-toggle-btn')}` : ''}`}
                        title={vacancy.status === 'active' ? 'Cerrar esta vacante (no aparecerá en la página pública)' : 'Activar esta vacante (aparecerá en la página pública)'}
                        aria-label={`${vacancy.status === 'active' ? 'Cerrar' : 'Activar'} vacante ${vacancy.title}`}
                      >
                        {isToggling ? (
                          'Procesando...'
                        ) : vacancy.status === 'active' ? (
                          <>
                            <span aria-hidden="true">🔒 </span>Cerrar
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">✅ </span>Activar
                          </>
                        )}
                      </button>
                      <button
                        data-tour={index === 0 ? 'vacancy-edit-btn' : undefined}
                        onClick={() => onOpenEditModal(vacancy)}
                        disabled={isRowBusy}
                        className={`text-blue-700 hover:text-blue-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-edit-btn')}` : ''}`}
                        aria-label={`Editar vacante ${vacancy.title}`}
                      >
                        <span aria-hidden="true">✏️ </span>Editar
                      </button>
                      <button
                        data-tour={index === 0 ? 'vacancy-delete-btn' : undefined}
                        onClick={() => onDeleteVacancy(vacancy.id, vacancy.title)}
                        disabled={isRowBusy}
                        className={`text-red-700 hover:text-red-900 font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-delete-btn')}` : ''}`}
                        aria-label={`Eliminar vacante ${vacancy.title}`}
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
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentVacancyPage}
        totalItems={filteredVacancies.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentVacancyPage}
      />
    </div>
  )
}
