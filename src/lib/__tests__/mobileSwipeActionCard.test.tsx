// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileSwipeActionCard from '@/components/admin/mobile/MobileSwipeActionCard'

const getSwipeSurface = () => {
  const content = screen.getByText('Card content')
  const wrapper = content.parentElement
  const swipeSurface = wrapper?.parentElement as HTMLDivElement | null
  if (!swipeSurface) throw new Error('Swipe surface not found')
  return swipeSurface
}

describe('MobileSwipeActionCard', () => {
  it('abre acciones con gesto horizontal', () => {
    render(
      <MobileSwipeActionCard
        actions={[
          { key: 'view', label: 'Ver', onClick: vi.fn() }
        ]}
      >
        <div>
          <p>Card content</p>
        </div>
      </MobileSwipeActionCard>
    )

    const swipeSurface = getSwipeSurface()

    fireEvent.touchStart(swipeSurface, { touches: [{ clientX: 220, clientY: 180 }] })
    fireEvent.touchMove(swipeSurface, { touches: [{ clientX: 150, clientY: 178 }] })
    fireEvent.touchEnd(swipeSurface)

    expect(swipeSurface.style.transform).toContain('-88px')
  })

  it('no abre acciones con gesto vertical', () => {
    render(
      <MobileSwipeActionCard
        actions={[
          { key: 'view', label: 'Ver', onClick: vi.fn() }
        ]}
      >
        <div>
          <p>Card content</p>
        </div>
      </MobileSwipeActionCard>
    )

    const swipeSurface = getSwipeSurface()

    fireEvent.touchStart(swipeSurface, { touches: [{ clientX: 200, clientY: 200 }] })
    fireEvent.touchMove(swipeSurface, { touches: [{ clientX: 190, clientY: 260 }] })
    fireEvent.touchEnd(swipeSurface)

    expect(swipeSurface.style.transform).toContain('0px')
  })

  it('ejecuta acción por tap y cierra swipe', () => {
    const onDelete = vi.fn()

    render(
      <MobileSwipeActionCard
        actions={[
          { key: 'delete', label: 'Eliminar', onClick: onDelete, className: 'bg-red-600' }
        ]}
      >
        <div>
          <p>Card content</p>
        </div>
      </MobileSwipeActionCard>
    )

    const swipeSurface = getSwipeSurface()

    fireEvent.touchStart(swipeSurface, { touches: [{ clientX: 220, clientY: 180 }] })
    fireEvent.touchMove(swipeSurface, { touches: [{ clientX: 130, clientY: 176 }] })
    fireEvent.touchEnd(swipeSurface)

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(swipeSurface.style.transform).toContain('0px')
  })

  it('cierra acciones al hacer scroll de ventana', async () => {
    render(
      <MobileSwipeActionCard
        actions={[
          { key: 'view', label: 'Ver', onClick: vi.fn() }
        ]}
      >
        <div>
          <p>Card content</p>
        </div>
      </MobileSwipeActionCard>
    )

    const swipeSurface = getSwipeSurface()

    fireEvent.touchStart(swipeSurface, { touches: [{ clientX: 220, clientY: 180 }] })
    fireEvent.touchMove(swipeSurface, { touches: [{ clientX: 130, clientY: 176 }] })
    fireEvent.touchEnd(swipeSurface)
    expect(swipeSurface.style.transform).toContain('-88px')

    fireEvent.scroll(window)

    await waitFor(() => {
      expect(swipeSurface.style.transform).toContain('0px')
    })
  })
})

