'use client'

import { useMemo, useState, type ReactNode } from 'react'

type SwipeAction = {
  key: string
  label: string
  onClick: () => void
  className?: string
  disabled?: boolean
}

interface MobileSwipeActionCardProps {
  children: ReactNode
  actions: SwipeAction[]
}

const ACTION_WIDTH = 88

export default function MobileSwipeActionCard({ children, actions }: MobileSwipeActionCardProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const maxReveal = useMemo(() => actions.length * ACTION_WIDTH, [actions.length])

  const closeSwipe = () => setOffsetX(0)

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return
    const currentX = event.touches[0]?.clientX ?? touchStartX
    const delta = currentX - touchStartX

    if (delta > 0) {
      setOffsetX(Math.min(0, -Math.max(0, maxReveal - delta)))
      return
    }

    setOffsetX(Math.max(delta, -maxReveal))
  }

  const handleTouchEnd = () => {
    setTouchStartX(null)
    if (offsetX <= -(maxReveal * 0.4)) {
      setOffsetX(-maxReveal)
      return
    }
    setOffsetX(0)
  }

  const isOpen = offsetX !== 0

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
            className={`w-[88px] px-2 text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed ${action.className ?? 'bg-primary-600'}`}
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
