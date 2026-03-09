// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileFilterSheet from '@/components/admin/mobile/MobileFilterSheet'

const options = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'closed', label: 'Cerrados' }
]

describe('MobileFilterSheet', () => {
  it('muestra el valor actual en el trigger y abre/cierra el sheet', () => {
    render(
      <MobileFilterSheet
        label="Filtrar por estado"
        value="all"
        options={options}
        onChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Filtrar por estado' })
    expect(trigger).toBeTruthy()
    expect(trigger.textContent).toContain('Todos')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Filtrar por estado' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Filtrar por estado' })).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('selecciona una opción y dispara onChange', () => {
    const onChange = vi.fn()

    render(
      <MobileFilterSheet
        label="Filtrar por estado"
        value="all"
        options={options}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por estado' }))
    fireEvent.click(screen.getByRole('option', { name: 'Activos' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('active')
    expect(screen.queryByRole('dialog', { name: 'Filtrar por estado' })).toBeNull()
  })

  it('cierra por backdrop y tecla Escape con atributos ARIA correctos', () => {
    render(
      <MobileFilterSheet
        label="Dirección de orden"
        value="all"
        options={options}
        onChange={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Dirección de orden' })
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')

    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Dirección de orden' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar selector de Dirección de orden' }))
    expect(screen.queryByRole('dialog', { name: 'Dirección de orden' })).toBeNull()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Dirección de orden' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Dirección de orden' })).toBeNull()
  })
})
