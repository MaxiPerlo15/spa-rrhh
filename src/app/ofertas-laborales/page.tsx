'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import VacancyCard from '@/components/VacancyCard'
import PostularForm from '@/components/PostularForm'

interface Vacancy {
  id: string
  title: string
  description: string
  location: string
  workday: 'FULL_TIME' | 'PART_TIME' | 'PROJECT_BASED' | 'INTERNSHIP'
  modality: 'ON_SITE' | 'REMOTE' | 'HYBRID'
  salary?: string
  requirements?: string
  benefits?: string
  createdAt: string
}

export default function VacantesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [filteredVacancies, setFilteredVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVacancy, setSelectedVacancy] = useState<{ id: string; title: string } | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWorkday, setFilterWorkday] = useState<string>('all')
  const [filterModality, setFilterModality] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')

  // Obtener ubicaciones únicas
  const uniqueLocations = Array.from(new Set(vacancies.map(v => v.location)))

  useEffect(() => {
    fetchVacancies()
  }, [])

  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...vacancies]

      // Filtro por búsqueda
      if (searchTerm) {
        filtered = filtered.filter(v => 
          v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.location.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Filtro por jornada
      if (filterWorkday !== 'all') {
        filtered = filtered.filter(v => v.workday === filterWorkday)
      }

      // Filtro por modalidad
      if (filterModality !== 'all') {
        filtered = filtered.filter(v => v.modality === filterModality)
      }

      // Filtro por ubicación
      if (filterLocation !== 'all') {
        filtered = filtered.filter(v => v.location === filterLocation)
      }

      setFilteredVacancies(filtered)
    }
    
    applyFilters()
  }, [searchTerm, filterWorkday, filterModality, filterLocation, vacancies])

  const fetchVacancies = async () => {
    try {
      const response = await fetch('/api/vacancies')
      if (response.ok) {
        const data = await response.json()
        setVacancies(data)
        setFilteredVacancies(data)
      }
    } catch (error) {
      console.error('Error al cargar vacantes:', error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      {/* Hero Section */}
      <section className="bg-linear-to-r from-primary-500 to-primary-700 text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Ofertas Laborales
            </h1>
            <p className="text-lg text-white/90">
              Encuentra tu próxima oportunidad profesional. Todas nuestras vacantes son verificadas 
              y provienen de empresas de primer nivel.
            </p>
          </div>
        </div>
      </section>

      {/* Filtros y Búsqueda */}
      <section className="bg-white shadow-sm sticky top-16 z-40 border-b">
        <div className="container-custom py-6">
          {/* Barra de búsqueda */}
          <div className="mb-4">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Buscar por título, descripción o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
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

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filtro por jornada */}
            <select
              value={filterWorkday}
              onChange={(e) => setFilterWorkday(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all">Todas las jornadas</option>
              <option value="FULL_TIME">Jornada Completa</option>
              <option value="PART_TIME">Media Jornada</option>
              <option value="PROJECT_BASED">Por Proyecto</option>
              <option value="INTERNSHIP">Pasantía</option>
            </select>

            {/* Filtro por modalidad */}
            <select
              value={filterModality}
              onChange={(e) => setFilterModality(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all">Todas las modalidades</option>
              <option value="ON_SITE">Presencial</option>
              <option value="REMOTE">Remoto</option>
              <option value="HYBRID">Híbrido</option>
            </select>

            {/* Filtro por ubicación */}
            {uniqueLocations.length > 0 && (
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="all">Todas las ubicaciones</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            )}

            {/* Botón limpiar filtros */}
            {(searchTerm || filterWorkday !== 'all' || filterModality !== 'all' || filterLocation !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            )}

            {/* Contador de resultados */}
            <div className="ml-auto text-sm text-gray-600">
              {filteredVacancies.length} {filteredVacancies.length === 1 ? 'vacante' : 'vacantes'}
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Vacantes */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                <p className="text-gray-600 mt-4">Cargando vacantes...</p>
              </div>
            ) : filteredVacancies.length > 0 ? (
              <>
                {filteredVacancies.map((vacancy) => (
                  <VacancyCard
                    key={vacancy.id}
                    id={vacancy.id}
                    title={vacancy.title}
                    description={vacancy.description}
                    location={vacancy.location}
                    workday={vacancy.workday}
                    modality={vacancy.modality}
                    salary={vacancy.salary}
                    requirements={vacancy.requirements}
                    benefits={vacancy.benefits}
                    onApply={handleApply}
                  />
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
                  {vacancies.length === 0 
                    ? 'No hay ofertas laborales disponibles en este momento.' 
                    : 'Intenta ajustar tus filtros de búsqueda.'}
                </p>
                {(searchTerm || filterWorkday !== 'all' || filterModality !== 'all' || filterLocation !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal de postulación */}
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
