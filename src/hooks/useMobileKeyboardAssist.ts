'use client'

import { useEffect, useRef } from 'react'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'
const KEYBOARD_VIEWPORT_DELTA_PX = 120
const SCROLL_DEBOUNCE_MS = 140

const isFocusableField = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  if (!(target instanceof HTMLElement)) return false
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function useMobileKeyboardAssist() {
  const timerRef = useRef<number | null>(null)
  const activeElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const scrollFieldIntoView = (target: HTMLElement) => {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth'
      })
    }

    const scheduleScroll = (target: HTMLElement) => {
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        scrollFieldIntoView(target)
      }, SCROLL_DEBOUNCE_MS)
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!mediaQuery.matches) return
      if (!isFocusableField(event.target)) return

      activeElementRef.current = event.target
      scheduleScroll(event.target)
    }

    const handleViewportResize = () => {
      if (!mediaQuery.matches) return
      const target = activeElementRef.current
      if (!target) return
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return

      const viewport = window.visualViewport
      if (!viewport) {
        scheduleScroll(target)
        return
      }

      const delta = window.innerHeight - viewport.height
      if (delta >= KEYBOARD_VIEWPORT_DELTA_PX) {
        scheduleScroll(target)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    window.visualViewport?.addEventListener('resize', handleViewportResize)

    return () => {
      clearTimer()
      document.removeEventListener('focusin', handleFocusIn)
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
    }
  }, [])
}

