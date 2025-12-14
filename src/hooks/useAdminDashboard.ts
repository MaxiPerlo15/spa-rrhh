/**
 * useAdminDashboard Hook
 * Hook personalizado que maneja toda la lógica del panel administrativo
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import * as vacanciesApi from '@/lib/api/vacancies'
import * as applicationsApi from '@/lib/api/applications'
import * as contactsApi from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'

export interface DashboardStats {
  totalVacancies: number
  activeVacancies: number
  totalApplications: number
  pendingContacts: number
}

export function useAdminDashboard() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calcular estadísticas
  const stats: DashboardStats = {
    totalVacancies: vacancies.length,
    activeVacancies: vacancies.filter(v => v.status === 'active').length,
    totalApplications: applications.length,
    pendingContacts: contacts.filter(c => c.status === 'PENDING').length
  }

  // Cargar todos los datos
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [vacanciesData, applicationsData, contactsData] = await Promise.all([
        vacanciesApi.getVacancies(),
        applicationsApi.getApplications(),
        contactsApi.getContacts()
      ])

      setVacancies(vacanciesData)
      setApplications(applicationsData)
      setContacts(contactsData)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Métodos para vacantes
  const createVacancy = async (data: vacanciesApi.CreateVacancyData) => {
    const newVacancy = await vacanciesApi.createVacancy(data)
    setVacancies(prev => [newVacancy, ...prev])
    return newVacancy
  }

  const updateVacancy = async (id: string, data: vacanciesApi.UpdateVacancyData) => {
    const updatedVacancy = await vacanciesApi.updateVacancy(id, data)
    setVacancies(prev => prev.map(v => v.id === id ? updatedVacancy : v))
    return updatedVacancy
  }

  const deleteVacancy = async (id: string) => {
    await vacanciesApi.deleteVacancy(id)
    setVacancies(prev => prev.filter(v => v.id !== id))
  }

  const toggleVacancyStatus = async (vacancy: Vacancy) => {
    const updated = await vacanciesApi.toggleVacancyStatus(vacancy)
    setVacancies(prev => prev.map(v => v.id === vacancy.id ? updated : v))
    return updated
  }

  // Métodos para postulaciones
  const updateApplicationStatus = async (id: string, status: Application['status']) => {
    const updated = await applicationsApi.updateApplicationStatus(id, status)
    setApplications(prev => prev.map(a => a.id === id ? updated : a))
    return updated
  }

  // Métodos para contactos
  const updateContactStatus = async (id: string, status: Contact['status']) => {
    const updated = await contactsApi.updateContactStatus(id, status)
    setContacts(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }

  const deleteContact = async (id: string) => {
    await contactsApi.deleteContact(id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  return {
    // Data
    vacancies,
    applications,
    contacts,
    stats,
    isLoading,
    error,

    // Actions
    fetchDashboardData,
    
    // Vacancies
    createVacancy,
    updateVacancy,
    deleteVacancy,
    toggleVacancyStatus,
    
    // Applications
    updateApplicationStatus,
    
    // Contacts
    updateContactStatus,
    deleteContact
  }
}
