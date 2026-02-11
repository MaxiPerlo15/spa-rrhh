// @vitest-environment jsdom

import { renderHook, act} from '@testing-library/react'
import {expect, vi, describe, it} from 'vitest'
import { useAdminDashboard } from '../../hooks/useAdminDashboard'
import * as vacanciesApi from '../../lib/api/vacancies'

// Mock de las APIs
vi.mock('../../lib/api/vacancies.ts', () => ({
  getVacancies: vi.fn(() => Promise.resolve([
    {id: '1', status: 'active'},
    {id: '2', status: 'inactive'}
  ]))
}))
vi.mock('../../lib/api/applications.ts', () => ({
  getApplications: vi.fn(() => Promise.resolve([
    {id: 'a1', status: 'PENDING'},
    {id: 'a2', status: 'APPROVED'}
    ]))
}))
vi.mock('../../lib/api/contacts.ts', () => ({
  getContacts: vi.fn(() => Promise.resolve([
    {id: 'c1', status: 'PENDING'},
    {id: 'c2', status: 'DONE'}
  ]))
}))

describe('useAdminDashboard', () => {
    it('Carga datos y calcula stats correctamente', async () => {
      const { result } = renderHook(() => useAdminDashboard())
      
      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        await Promise.resolve()
        })
        
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
        
        // Verificar datos cargados
        expect(result.current.vacancies).toHaveLength(2)
        expect(result.current.applications).toHaveLength(2)
        expect(result.current.contacts).toHaveLength(2)

        expect(result.current.stats).toEqual({
          totalVacancies: 2,
          activeVacancies: 1,
          totalApplications: 2,
          pendingContacts: 1
        })
    })
    it('Maneja errores al cargar datos', async () => {
        // Forzar error en API de vacantes
        vi.mocked(vacanciesApi.getVacancies).mockImplementationOnce(() => Promise.reject(new Error('Error de red')))

        const { result } = renderHook(() => useAdminDashboard())

        await act(async () => {
          await Promise.resolve()
        })
        
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBe('Error de red')
    })
})
