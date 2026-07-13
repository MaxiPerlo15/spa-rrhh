/**
 * useAdminDashboard Hook
 * Hook personalizado que maneja toda la lógica del panel administrativo
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as vacanciesApi from '@/lib/api/vacancies'
import * as applicationsApi from '@/lib/api/applications'
import * as contactsApi from '@/lib/api/contacts'
import type { Vacancy } from '@/lib/api/vacancies'
import type { Application } from '@/lib/api/applications'
import type { Contact } from '@/lib/api/contacts'
import {
  buildDashboardStats,
  type DashboardStats,
  mergeApplicationsById,
  prependItem,
  removeItemById,
  replaceItemById,
} from '@/application/admin/dashboardState'

type UseAdminDashboardOptions = {
  enabled?: boolean
}

export function useAdminDashboard(options: UseAdminDashboardOptions = {}) {
  const { enabled = true } = options
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const latestRequestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  // Calcular estadísticas
  const stats: DashboardStats = buildDashboardStats({
    vacancies,
    applications,
    contacts
  })

  // Cargar todos los datos
  const fetchDashboardData = useCallback(async () => {
    if (!enabled) {
      return
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    setIsLoading(true)
    setError(null)

    try {
      const [vacanciesData, applicationsData, contactsData] = await Promise.all([
        vacanciesApi.getVacancies({ includeAll: true }),
        applicationsApi.getApplications(),
        contactsApi.getContacts()
      ])

      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return
      }

      setVacancies(vacanciesData)
      setApplications(applicationsData)
      setContacts(contactsData)
    } catch (err) {
      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return
      }
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los datos')
    } finally {
      if (isMountedRef.current && latestRequestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [enabled])

  // Cargar datos al montar el componente
  useEffect(() => {
    isMountedRef.current = true
    if (!enabled) {
      setIsLoading(false)
      setError(null)
      return () => {
        isMountedRef.current = false
      }
    }
    fetchDashboardData()
    return () => {
      isMountedRef.current = false
    }
  }, [enabled, fetchDashboardData])

  // Métodos para vacantes
  const createVacancy = async (data: vacanciesApi.CreateVacancyData) => {
    const newVacancy = await vacanciesApi.createVacancy(data)
    setVacancies(prev => prependItem(prev, newVacancy))
    return newVacancy
  }

  const updateVacancy = async (id: string, data: vacanciesApi.UpdateVacancyData) => {
    const updatedVacancy = await vacanciesApi.updateVacancy(id, data)
    setVacancies(prev => replaceItemById(prev, id, updatedVacancy))
    return updatedVacancy
  }

  const deleteVacancy = async (id: string) => {
    const closedVacancy = await vacanciesApi.deleteVacancy(id)
    setVacancies(prev => replaceItemById(prev, id, closedVacancy))
    return closedVacancy
  }

  const toggleVacancyStatus = async (vacancy: Vacancy) => {
    const updated = await vacanciesApi.toggleVacancyStatus(vacancy)
    setVacancies(prev => replaceItemById(prev, vacancy.id, updated))
    return updated
  }

  // Métodos para postulaciones
  const updateApplicationStatus = async (id: string, status: Application['status']) => {
    const updated = await applicationsApi.updateApplicationStatus(id, status)
    setApplications(prev => replaceItemById(prev, id, updated))
    return updated
  }

  const deleteApplication = async (id: string) => {
    await applicationsApi.deleteApplication(id)
    setApplications(prev => removeItemById(prev, id))
  }

  const createCandidate = async (data: applicationsApi.CreateAdminCandidateData) => {
    const created = await applicationsApi.createAdminCandidate(data)
    setApplications(prev => prependItem(prev, created))
    return created
  }

  const updateCandidate = async (id: string, data: applicationsApi.UpdateAdminCandidateData) => {
    const updatedApplications = await applicationsApi.updateAdminCandidate(id, data)
    setApplications(prev => mergeApplicationsById(prev, updatedApplications))
    return updatedApplications
  }

  // Métodos para contactos
  const updateContactStatus = async (id: string, status: Contact['status']) => {
    const updated = await contactsApi.updateContactStatus(id, status)
    setContacts(prev => replaceItemById(prev, id, updated))
    return updated
  }

  const deleteContact = async (id: string) => {
    await contactsApi.deleteContact(id)
    setContacts(prev => removeItemById(prev, id))
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
    createCandidate,
    updateCandidate,
    updateApplicationStatus,
    deleteApplication,
    
    // Contacts
    updateContactStatus,
    deleteContact
  }
}
