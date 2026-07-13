import { describe, expect, it } from 'vitest'
import {
  buildJobBoardLocations,
  buildJobBoardVacancies,
  mapApiVacanciesToJobBoardVacancies,
} from '@/application/public/jobBoardCollections'

const vacancies = [
  {
    id: 'v1',
    title: 'Backend Developer',
    description: 'Java y Spring',
    location: 'Cordoba',
    workday: 'FULL_TIME' as const,
    modality: 'HYBRID' as const,
    createdAt: ''
  },
  {
    id: 'v2',
    title: 'Frontend Developer',
    description: 'React y TypeScript',
    location: 'Buenos Aires',
    workday: 'PART_TIME' as const,
    modality: 'REMOTE' as const,
    createdAt: ''
  }
]

describe('jobBoardCollections', () => {
  it('arma ubicaciones únicas', () => {
    expect(buildJobBoardLocations(vacancies)).toEqual(['Cordoba', 'Buenos Aires'])
  })

  it('filtra vacantes del board público', () => {
    const result = buildJobBoardVacancies(vacancies, {
      searchTerm: 'react',
      workday: 'PART_TIME',
      modality: 'REMOTE',
      location: 'Buenos Aires'
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('v2')
  })

  it('normaliza vacantes de API al contrato del board público', () => {
    const result = mapApiVacanciesToJobBoardVacancies([
      {
        id: 'v3',
        title: 'QA Engineer',
        location: 'Cordoba',
        workday: 'FULL_TIME',
        modality: 'HYBRID',
        createdAt: '',
      }
    ])

    expect(result).toEqual([
      expect.objectContaining({
        id: 'v3',
        title: 'QA Engineer',
        description: '',
        workday: 'FULL_TIME',
        modality: 'HYBRID'
      })
    ])
  })
})
