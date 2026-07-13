// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminCandidatesSection from '@/components/admin/sections/AdminCandidatesSection'
import type { CandidateSummary } from '@/lib/candidates'

describe('AdminCandidatesSection', () => {
  it('informa cuando no hay candidatos registrados', () => {
    render(
      <AdminCandidatesSection
        candidates={[]}
        filteredCandidates={[]}
        paginatedCandidates={[]}
        currentCandidatePage={1}
        itemsPerPage={10}
        setCurrentCandidatePage={vi.fn<(page: number) => void>()}
        searchCandidates=""
        setSearchCandidates={vi.fn<(value: string) => void>()}
        onOpenCreateCandidate={vi.fn()}
        onEditCandidate={vi.fn()}
        onExportCsv={vi.fn()}
        isExportingCsv={false}
      />
    )

    expect(screen.getAllByText('No hay candidatos registrados').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /\+ Registrar candidato/i })).toBeTruthy()
  })

  it('muestra candidato, CV y postulaciones asociadas', () => {
    const candidate: CandidateSummary = {
      id: 'cand-1',
      candidateName: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+54 9 11 1234-5678',
      latestStatus: 'INTERVIEWED',
      latestSubmittedAt: '2026-03-12T12:00:00.000Z',
      resumeUrl: 'https://utfs.io/f/cv.pdf',
      resumeFileName: 'cv-ana.pdf',
      applications: [
        {
          id: 'app-1',
          status: 'INTERVIEWED',
          submittedAt: '2026-03-12T12:00:00.000Z',
          vacancyTitle: 'Generalista SR'
        }
      ]
    }

    render(
      <AdminCandidatesSection
        candidates={[candidate]}
        filteredCandidates={[candidate]}
        paginatedCandidates={[candidate]}
        currentCandidatePage={1}
        itemsPerPage={10}
        setCurrentCandidatePage={vi.fn<(page: number) => void>()}
        searchCandidates=""
        setSearchCandidates={vi.fn<(value: string) => void>()}
        onOpenCreateCandidate={vi.fn()}
        onEditCandidate={vi.fn()}
        onExportCsv={vi.fn()}
        isExportingCsv={false}
      />
    )

    expect(screen.getAllByText('Ana Perez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('cv-ana.pdf').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Generalista SR/).length).toBeGreaterThan(0)
  })

  it('permite abrir la edición de un candidato', () => {
    const candidate: CandidateSummary = {
      id: 'cand-1',
      candidateName: 'Ana Perez',
      email: 'ana@example.com',
      phone: '+54 9 11 1234-5678',
      latestStatus: 'PENDING',
      latestSubmittedAt: '2026-03-12T12:00:00.000Z',
      applications: [
        {
          id: 'app-1',
          status: 'PENDING',
          submittedAt: '2026-03-12T12:00:00.000Z',
          vacancyTitle: 'Generalista SR'
        }
      ]
    }
    const onEditCandidate = vi.fn<(candidate: CandidateSummary) => void>()

    render(
      <AdminCandidatesSection
        candidates={[candidate]}
        filteredCandidates={[candidate]}
        paginatedCandidates={[candidate]}
        currentCandidatePage={1}
        itemsPerPage={10}
        setCurrentCandidatePage={vi.fn<(page: number) => void>()}
        searchCandidates=""
        setSearchCandidates={vi.fn<(value: string) => void>()}
        onOpenCreateCandidate={vi.fn()}
        onEditCandidate={onEditCandidate}
        onExportCsv={vi.fn()}
        isExportingCsv={false}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: /modificar/i })[0])

    expect(onEditCandidate).toHaveBeenCalledWith(candidate)
  })
})
