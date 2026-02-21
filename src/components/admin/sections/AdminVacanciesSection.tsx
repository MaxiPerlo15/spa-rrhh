import { useMemo } from 'react'
import Pagination from '@/components/Pagination'
import { useVirtualizedRows } from '@/hooks/useVirtualizedRows'
import type { Vacancy } from '@/lib/api/vacancies'

interface AdminVacanciesSectionProps {
  filteredVacancies: Vacancy[]
  paginatedVacancies: Vacancy[]
  currentVacancyPage: number
  itemsPerPage: number
  setItemsPerPage: (value: number) => void
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
  setItemsPerPage,
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
  const { isVirtualized, visibleRows, hasMoreRows, handleScroll } = useVirtualizedRows({
    enabled: itemsPerPage >= 50,
    totalRows: paginatedVacancies.length
  })
  const visibleVacancies = useMemo(() => paginatedVacancies.slice(0, visibleRows), [paginatedVacancies, visibleRows])

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar por título o ubicación"
            value={searchVacancies}
            onChange={(event) => setSearchVacancies(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <select
            value={filterVacancyStatus}
            onChange={(event) => setFilterVacancyStatus(event.target.value as 'all' | 'active' | 'closed')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="closed">Cerradas</option>
          </select>
          <select
            value={sortVacanciesBy}
            onChange={(event) => setSortVacanciesBy(event.target.value as 'createdAt' | 'title' | 'location' | 'status')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="createdAt">Ordenar por fecha</option>
            <option value="title">Ordenar por título</option>
            <option value="location">Ordenar por ubicación</option>
            <option value="status">Ordenar por estado</option>
          </select>
          <select
            value={sortVacanciesDirection}
            onChange={(event) => setSortVacanciesDirection(event.target.value as 'asc' | 'desc')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguos primero</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(event) => setItemsPerPage(Number(event.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={200}>200 por página</option>
          </select>
        </div>
      </div>

      <div
        className={isVirtualized ? 'overflow-auto max-h-[34rem]' : 'overflow-x-auto'}
        onScroll={isVirtualized ? handleScroll : undefined}
      >
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
            {visibleVacancies.map((vacancy, index) => {
              const isToggling = pendingToggleVacancyId === vacancy.id
              const isDeleting = pendingDeleteVacancyId === vacancy.id
              const isRowBusy = isToggling || isDeleting
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
              return (
                <tr key={vacancy.id} className="hover:bg-gray-50">
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
                          vacancy.status === 'active' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'
                        } font-medium disabled:opacity-60 disabled:cursor-not-allowed ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-toggle-btn')}` : ''}`}
                        title={vacancy.status === 'active' ? 'Cerrar esta vacante (no aparecerá en la página pública)' : 'Activar esta vacante (aparecerá en la página pública)'}
                      >
                        {isToggling ? 'Procesando...' : vacancy.status === 'active' ? '🔒 Cerrar' : '✅ Activar'}
                      </button>
                      <button
                        data-tour={index === 0 ? 'vacancy-edit-btn' : undefined}
                        onClick={() => onOpenEditModal(vacancy)}
                        disabled={isRowBusy}
                        className={`text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-edit-btn')}` : ''}`}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        data-tour={index === 0 ? 'vacancy-delete-btn' : undefined}
                        onClick={() => onDeleteVacancy(vacancy.id, vacancy.title)}
                        disabled={isRowBusy}
                        className={`text-red-600 hover:text-red-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${index === 0 ? `rounded-md px-1 ${getTourClass('vacancy-delete-btn')}` : ''}`}
                      >
                        {isDeleting ? 'Eliminando...' : '🗑️ Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {isVirtualized && hasMoreRows && (
              <tr>
                <td colSpan={7} className="px-6 py-3 text-center text-xs text-gray-500">
                  Desplaza para cargar más filas...
                </td>
              </tr>
            )}
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
