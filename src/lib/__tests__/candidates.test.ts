import { describe, expect, it } from 'vitest'
import { buildCandidateSummaries } from '@/lib/candidates'
import type { Application } from '@/lib/api/applications'

describe('buildCandidateSummaries', () => {
  it('agrupa postulaciones del mismo candidato por candidateId', () => {
    const applications: Application[] = [
      {
        id: 'app-1',
        candidateId: 'cand-1',
        candidateName: 'Ana Perez',
        email: 'ana@example.com',
        phone: '+54 9 11 1234-5678',
        status: 'PENDING',
        submittedAt: '2026-03-10T10:00:00.000Z',
        vacancy: { id: 'vac-1', title: 'Analista RRHH' },
        resumeUrl: 'https://utfs.io/f/cv-1.pdf',
        resumeFileName: 'cv-ana.pdf'
      },
      {
        id: 'app-2',
        candidateId: 'cand-1',
        candidateName: 'Ana Perez',
        email: 'ANA@example.com',
        phone: '+54 9 11 1234-5678',
        status: 'INTERVIEWED',
        submittedAt: '2026-03-12T12:00:00.000Z',
        vacancy: { id: 'vac-2', title: 'Generalista SR' },
        resumeUrl: 'https://utfs.io/f/cv-2.pdf',
        resumeFileName: 'cv-ana-actualizado.pdf'
      },
      {
        id: 'app-3',
        candidateId: 'cand-2',
        candidateName: 'Carlos Diaz',
        email: 'carlos@example.com',
        phone: '+54 9 351 555-5555',
        status: 'REVIEWING',
        submittedAt: '2026-03-11T09:00:00.000Z',
        vacancy: undefined
      }
    ]

    const candidates = buildCandidateSummaries(applications)

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      candidateName: 'Ana Perez',
      latestStatus: 'INTERVIEWED',
      resumeFileName: 'cv-ana-actualizado.pdf'
    })
    expect(candidates[0].applications).toHaveLength(2)
    expect(candidates[0].applications[0]).toMatchObject({
      vacancyTitle: 'Generalista SR'
    })
    expect(candidates[1]).toMatchObject({
      candidateName: 'Carlos Diaz',
      latestStatus: 'REVIEWING'
    })
  })
})
