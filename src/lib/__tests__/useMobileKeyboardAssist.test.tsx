// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMobileKeyboardAssist } from '@/hooks/useMobileKeyboardAssist'

function KeyboardAssistFixture() {
  useMobileKeyboardAssist()
  return (
    <div>
      <label htmlFor="target-input">Campo</label>
      <input id="target-input" />
    </div>
  )
}

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 767px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}

describe('useMobileKeyboardAssist', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.restoreAllMocks()
    mockMatchMedia(true)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: () => {}
      })
    }
  })

  it('hace scroll al campo enfocado en mobile', () => {
    const scrollSpy = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollSpy)

    render(<KeyboardAssistFixture />)

    const input = screen.getByLabelText('Campo')
    fireEvent.focusIn(input)
    vi.advanceTimersByTime(180)

    expect(scrollSpy).toHaveBeenCalled()
  })

  it('usa visualViewport resize para reforzar scroll con teclado abierto', () => {
    const scrollSpy = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollSpy)

    const viewportListeners: Record<string, EventListener> = {}
    const visualViewportMock = {
      height: 500,
      addEventListener: vi.fn((event: string, callback: EventListener) => {
        viewportListeners[event] = callback
      }),
      removeEventListener: vi.fn()
    }

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewportMock
    })

    render(<KeyboardAssistFixture />)
    const input = screen.getByLabelText('Campo')
    fireEvent.focusIn(input)
    vi.advanceTimersByTime(180)

    scrollSpy.mockClear()
    viewportListeners.resize?.(new Event('resize'))
    vi.advanceTimersByTime(180)

    expect(scrollSpy).toHaveBeenCalled()
  })

  it('no hace scroll fuera de mobile', () => {
    const scrollSpy = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollSpy)
    mockMatchMedia(false)

    render(<KeyboardAssistFixture />)

    const input = screen.getByLabelText('Campo')
    fireEvent.focusIn(input)
    vi.advanceTimersByTime(180)

    expect(scrollSpy).not.toHaveBeenCalled()
  })

  it('no hace scroll cuando focusin no apunta a un campo editable', () => {
    const scrollSpy = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollSpy)

    render(
      <div>
        <KeyboardAssistFixture />
        <button type="button">Accion</button>
      </div>
    )

    fireEvent.focusIn(screen.getByRole('button', { name: 'Accion' }))
    vi.advanceTimersByTime(180)

    expect(scrollSpy).not.toHaveBeenCalled()
  })

  it('cae al fallback sin visualViewport', () => {
    const scrollSpy = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollSpy)

    const viewportListeners: Record<string, EventListener> = {}
    const removeViewportListener = vi.fn()
    const visualViewportMock = {
      height: 500,
      addEventListener: vi.fn((event: string, callback: EventListener) => {
        viewportListeners[event] = callback
      }),
      removeEventListener: removeViewportListener
    }

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewportMock
    })

    render(<KeyboardAssistFixture />)
    const input = screen.getByLabelText('Campo')
    fireEvent.focusIn(input)
    vi.advanceTimersByTime(180)
    scrollSpy.mockClear()

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined
    })
    viewportListeners.resize?.(new Event('resize'))
    vi.advanceTimersByTime(180)

    expect(scrollSpy).toHaveBeenCalled()

    expect(removeViewportListener).not.toHaveBeenCalled()
  })

  it('limpia listeners al desmontar cuando visualViewport está disponible', () => {
    const removeViewportListener = vi.fn()
    const visualViewportMock = {
      height: 700,
      addEventListener: vi.fn(),
      removeEventListener: removeViewportListener
    }
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewportMock
    })
    const removeDocumentSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = render(<KeyboardAssistFixture />)
    unmount()

    expect(removeDocumentSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(removeViewportListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
