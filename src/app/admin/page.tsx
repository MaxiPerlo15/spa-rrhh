'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface Vacancy {
  id: string
  title: string
  location: string
  workday: string
  modality: string
  status: string
  createdAt: string
  description?: string
}

interface Stats {
  totalVacancies: number
  activeVacancies: number
  totalApplications: number
  pendingContacts: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [stats, setStats] = useState<Stats>({
    totalVacancies: 0,
    activeVacancies: 0,
    totalApplications: 0,
    pendingContacts: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
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
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      const [vacanciesRes, applicationsRes, contactsRes] = await Promise.all([
        fetch('/api/vacancies?all=true'),
        fetch('/api/applications'),
        fetch('/api/contacts')
      ])

      const vacanciesData = await vacanciesRes.json()
      const applicationsData = await applicationsRes.json()
      const contactsData = await contactsRes.json()

      setVacancies(vacanciesData)
      setStats({
        totalVacancies: vacanciesData.length,
        activeVacancies: vacanciesData.filter((v: Vacancy) => v.status === 'active').length,
        totalApplications: applicationsData.length,
        pendingContacts: contactsData.filter((c: { status: string }) => c.status === 'PENDING').length
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteVacancy = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta vacante?')) return

    try {
      const res = await fetch(`/api/vacancies/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error deleting vacancy:', error)
    }
  }

  const handleStatusToggle = async (vacancy: Vacancy) => {
    const newStatus = vacancy.status === 'active' ? 'closed' : 'active'
    
    try {
      const res = await fetch(`/api/vacancies/${vacancy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...vacancy, status: newStatus })
      })

      if (res.ok) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error updating vacancy:', error)
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
      const url = editingVacancy 
        ? `/api/vacancies/${editingVacancy.id}` 
        : '/api/vacancies'
      
      const method = editingVacancy ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        await fetchDashboardData()
        handleCloseModal()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error || 'No se pudo guardar la vacante'}`)
      }
    } catch (error) {
      console.error('Error saving vacancy:', error)
      alert('Error al guardar la vacante')
    } finally {
      setIsSaving(false)
    }
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
      {/* Header */}
      <header className="bg-primary-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-sm text-white/80">Bienvenido, {session.user?.name}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-sm font-medium text-white hover:text-yellow-400 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Vacantes</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalVacancies}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Vacantes Activas</div>
            <div className="text-3xl font-bold text-primary-500">{stats.activeVacancies}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Postulaciones</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalApplications}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Consultas Pendientes</div>
            <div className="text-3xl font-bold text-orange-600">{stats.pendingContacts}</div>
          </div>
        </div>

        {/* Vacancies Section */}
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
                {vacancies.map((vacancy) => {
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
                        onClick={() => handleDeleteVacancy(vacancy.id)}
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
        </div>
      </main>

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
    </div>
  )
}
