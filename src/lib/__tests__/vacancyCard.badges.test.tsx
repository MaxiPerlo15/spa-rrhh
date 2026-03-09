// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import VacancyCard, { getVacancyPublishedLabel } from '@/components/VacancyCard'

const baseProps = {
  id: 'vacancy-1',
  title: 'Analista de Datos',
  description: 'Descripción de prueba',
  location: 'Las Varillas',
  workday: 'FULL_TIME' as const,
  modality: 'ON_SITE' as const,
  onApply: vi.fn()
}

describe('VacancyCard badges de publicación', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-04T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra badge Nueva para ofertas con menos de 2 días', () => {
    render(
      <VacancyCard
        {...baseProps}
        createdAt="2026-03-03T10:00:00.000Z"
      />
    )

    expect(screen.getByText('Nueva')).toBeTruthy()
  })

  it('muestra badge Hace X días para ofertas de 2 días o más', () => {
    render(
      <VacancyCard
        {...baseProps}
        createdAt="2026-03-01T10:00:00.000Z"
      />
    )

    expect(screen.getByText(/^Hace \d+ días$/)).toBeTruthy()
  })

  it('muestra Hace 2 días exactamente en el umbral de 2 días', () => {
    expect(getVacancyPublishedLabel('2026-03-02T12:00:00.000Z')).toBe('Hace 2 días')
  })

  it('mantiene badge Hace X días en ofertas más antiguas', () => {
    render(
      <VacancyCard
        {...baseProps}
        createdAt="2026-02-20T10:00:00.000Z"
      />
    )

    expect(screen.queryByText('Nueva')).toBeNull()
    expect(screen.getByText(/^Hace \d+ días$/)).toBeTruthy()
  })

  it('no muestra badge si la fecha es inválida', () => {
    render(
      <VacancyCard
        {...baseProps}
        createdAt="fecha-invalida"
      />
    )

    expect(screen.queryByText('Nueva')).toBeNull()
    expect(screen.queryByText(/^Hace \d+ días$/)).toBeNull()
  })

  it('ejecuta Postularme', () => {
    const onApply = vi.fn()
    render(<VacancyCard {...baseProps} onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: 'Postularme' }))
    expect(onApply).toHaveBeenCalledWith('vacancy-1', 'Analista de Datos')
  })
})
