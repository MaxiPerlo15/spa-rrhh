// @vitest-environment jsdom

import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

import Toast from '@/components/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0)
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('limpia timers al desmontarse para no ejecutar onClose después del unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(<Toast message="Guardado" type="success" duration={1000} onClose={onClose} />)

    unmount()
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('reutiliza un único cierre cuando el usuario lo cierra manualmente', () => {
    const onClose = vi.fn()
    const { getByRole } = render(<Toast message="Guardado" type="success" duration={1000} onClose={onClose} />)

    fireEvent.click(getByRole('button', { name: 'Cerrar notificación' }))
    act(() => {
      vi.advanceTimersByTime(300)
      vi.advanceTimersByTime(5_000)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
