'use client'

import { useState } from 'react'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import VacancyCard from '@/components/VacancyCard'
import PostularForm from '@/components/PostularForm'
import MobileFilterSheet, { type FilterOption } from '@/components/admin/mobile/MobileFilterSheet'
import {
  buildJobBoardVacancies,
  type JobBoardVacancy as Vacancy,
} from '@/application/public/jobBoardCollections'

type PublicVacanciesClientProps = {
  initialVacancies: Vacancy[]
  initialLocations: string[]
  initialLoadError?: string | null
}

export default function PublicVacanciesClient({
  initialVacancies,
  initialLocations,
  initialLoadError = null
}: PublicVacanciesClientProps) {
  const [selectedVacancy, setSelectedVacancy] = useState<{ id: string; title: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWorkday, setFilterWorkday] = useState<string>('all')
  const [filterModality, setFilterModality] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const filteredVacancies = buildJobBoardVacancies(initialVacancies, {
    searchTerm,
    workday: filterWorkday,
    modality: filterModality,
    location: filterLocation
  })

  const workdayOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las jornadas' },
    { value: 'FULL_TIME', label: 'Jornada Completa' },
    { value: 'PART_TIME', label: 'Media Jornada' },
    { value: 'PROJECT_BASED', label: 'Por Proyecto' },
    { value: 'INTERNSHIP', label: 'Pasantía' }
  ]
  const modalityOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las modalidades' },
    { value: 'ON_SITE', label: 'Presencial' },
    { value: 'REMOTE', label: 'Remoto' },
    { value: 'HYBRID', label: 'Híbrido' }
  ]
  const locationOptions: FilterOption[] = [
    { value: 'all', label: 'Todas las ubicaciones' },
    ...initialLocations.map((location) => ({ value: location, label: location }))
  ]

  const handleApply = (id: string, title: string) => {
    setSelectedVacancy({ id, title })
  }

  const closeModal = () => {
    setSelectedVacancy(null)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterWorkday('all')
    setFilterModality('all')
    setFilterLocation('all')
  }

  const reloadPage = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <section className="bg-linear-to-r from-primary-500 to-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Ofertas Laborales
            </h1>
            <p className="text-base sm:text-lg text-white/90">
              Encuentra tu próxima oportunidad profesional. Todas nuestras vacantes son verificadas 
              y provienen de empresas de primer nivel.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white shadow-sm sticky top-16 z-40 border-b">
        <div className="container-custom py-6">
          <div className="mb-4">
            <div className="relative max-w-2xl">
              <input
                id="jobs-search"
                name="jobs_search"
                type="text"
                autoComplete="off"
                placeholder="Buscar por título, descripción o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 transition-shadow"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="w-full md:hidden space-y-3">
              <MobileFilterSheet
                label="Filtrar por jornada"
                value={filterWorkday}
                options={workdayOptions}
                onChange={setFilterWorkday}
                ariaLabel="Filtrar vacantes por jornada"
              />
              <MobileFilterSheet
                label="Filtrar por modalidad"
                value={filterModality}
                options={modalityOptions}
                onChange={setFilterModality}
                ariaLabel="Filtrar vacantes por modalidad"
              />
              {initialLocations.length > 0 && (
                <MobileFilterSheet
                  label="Filtrar por ubicación"
                  value={filterLocation}
                  options={locationOptions}
                  onChange={setFilterLocation}
                  ariaLabel="Filtrar vacantes por ubicación"
                />
              )}
            </div>

            <select
              id="jobs-filter-workday"
              name="jobs_filter_workday"
              value={filterWorkday}
              onChange={(e) => setFilterWorkday(e.target.value)}
              className="hidden md:block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all">Todas las jornadas</option>
              <option value="FULL_TIME">Jornada Completa</option>
              <option value="PART_TIME">Media Jornada</option>
              <option value="PROJECT_BASED">Por Proyecto</option>
              <option value="INTERNSHIP">Pasantía</option>
            </select>

            <select
              id="jobs-filter-modality"
              name="jobs_filter_modality"
              value={filterModality}
              onChange={(e) => setFilterModality(e.target.value)}
              className="hidden md:block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all">Todas las modalidades</option>
              <option value="ON_SITE">Presencial</option>
              <option value="REMOTE">Remoto</option>
              <option value="HYBRID">Híbrido</option>
            </select>

            {initialLocations.length > 0 && (
              <select
                id="jobs-filter-location"
                name="jobs_filter_location"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="hidden md:block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="all">Todas las ubicaciones</option>
                {initialLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            )}

            {(searchTerm || filterWorkday !== 'all' || filterModality !== 'all' || filterLocation !== 'all') && (
              <button
                onClick={clearFilters}
                className="btn-motion w-full sm:w-auto justify-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            )}

            <div className="w-full sm:w-auto sm:ml-auto text-sm font-medium text-center sm:text-left">
              <span className="text-gray-600">
                {filteredVacancies.length} {filteredVacancies.length === 1 ? 'vacante' : 'vacantes'}
              </span>
              {filteredVacancies.length > 0 && (
                <span className="text-green-600 ml-2">
                  disponible{filteredVacancies.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="results-transition flex flex-col gap-[22px] sm:gap-4 max-w-5xl mx-auto">
            {initialLoadError ? (
              <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-red-800 mb-2">
                  Ocurrió un error al cargar vacantes
                </h3>
                <p className="text-red-700 mb-4">{initialLoadError}</p>
                <button
                  onClick={reloadPage}
                  className="btn-motion px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredVacancies.length > 0 ? (
              <>
                {filteredVacancies.map((vacancy, index) => (
                  <div
                    key={vacancy.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
                  >
                    <VacancyCard
                      id={vacancy.id}
                      title={vacancy.title}
                      description={vacancy.description}
                      location={vacancy.location}
                      workday={vacancy.workday}
                      modality={vacancy.modality}
                      salary={vacancy.salary}
                      requirements={vacancy.requirements}
                      benefits={vacancy.benefits}
                      createdAt={vacancy.createdAt}
                      onApply={handleApply}
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No se encontraron vacantes
                </h3>
                <p className="text-gray-600 mb-4">
                  {initialVacancies.length === 0 
                    ? 'No hay ofertas laborales disponibles en este momento.' 
                    : 'Intenta ajustar tus filtros de búsqueda.'}
                </p>
                {(searchTerm || filterWorkday !== 'all' || filterModality !== 'all' || filterLocation !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="btn-motion px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedVacancy && (
        <PostularForm
          vacancyId={selectedVacancy.id}
          vacancyTitle={selectedVacancy.title}
          onClose={closeModal}
        />
      )}

      <Footer />
    </div>
  )
}
