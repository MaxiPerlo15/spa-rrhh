'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

type SwipeAction = {
  key: string
  label: string
  ariaLabel?: string
  onClick: () => void
  className?: string
  disabled?: boolean
}

interface MobileSwipeActionCardProps {
  children: ReactNode
  actions: SwipeAction[]
}

const ACTION_WIDTH = 88
const HORIZONTAL_THRESHOLD_PX = 12
const AXIS_BIAS_PX = 4

export default function MobileSwipeActionCard({ children, actions }: MobileSwipeActionCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [gestureMode, setGestureMode] = useState<'undecided' | 'horizontal' | 'vertical'>('undecided')

  const maxReveal = useMemo(() => actions.length * ACTION_WIDTH, [actions.length])

  const closeSwipe = () => setOffsetX(0)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null)
    setTouchStartY(event.touches[0]?.clientY ?? null)
    setGestureMode('undecided')
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null || touchStartY === null) return
    const currentX = event.touches[0]?.clientX ?? touchStartX
    const currentY = event.touches[0]?.clientY ?? touchStartY
    const delta = currentX - touchStartX
    const deltaY = currentY - touchStartY
    const absDeltaX = Math.abs(delta)
    const absDeltaY = Math.abs(deltaY)

    if (gestureMode === 'undecided') {
      if (absDeltaX < HORIZONTAL_THRESHOLD_PX && absDeltaY < HORIZONTAL_THRESHOLD_PX) return

      if (absDeltaX > absDeltaY + AXIS_BIAS_PX) {
        setGestureMode('horizontal')
      } else {
        setGestureMode('vertical')
        return
      }
    }

    if (gestureMode === 'vertical') return

    if (delta >= 0) {
      setOffsetX(Math.min(0, -Math.max(0, maxReveal - delta)))
      return
    }

    setOffsetX(Math.max(delta, -maxReveal))
  }

  const handleTouchEnd = () => {
    setTouchStartX(null)
    setTouchStartY(null)
    if (offsetX <= -(maxReveal * 0.35)) {
      setOffsetX(-maxReveal)
      setGestureMode('undecided')
      return
    }
    setOffsetX(0)
    setGestureMode('undecided')
  }

  const isOpen = offsetX !== 0

  useEffect(() => {
    if (!isOpen) return
    const handleWindowScroll = () => closeSwipe()
    window.addEventListener('scroll', handleWindowScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [isOpen])

  const handleVerticalScroll = () => {
    if (!isOpen) return
    closeSwipe()
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => {
              action.onClick()
              closeSwipe()
            }}
            disabled={action.disabled}
            aria-label={action.ariaLabel ?? action.label}
            className={`w-[88px] min-h-11 px-2 text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/95 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-700 ${action.className ?? 'bg-primary-600'}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div
        className="relative bg-white transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleVerticalScroll}
      >
        {children}
      </div>

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar acciones rápidas"
          className="absolute left-0 top-0 h-full w-8 bg-transparent"
          onClick={closeSwipe}
        />
      )}
    </div>
  )
}
