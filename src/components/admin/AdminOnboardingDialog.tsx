'use client'

import { useEffect, type CSSProperties } from 'react'

interface AdminOnboardingDialogProps {
  isOpen: boolean
  stepIndex: number
  totalSteps: number
  title: string
  body: string
  modeLabel?: string
  primaryLabel?: string
  skipLabel?: string
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  backActionLabel?: string
  onBackAction?: () => void
  positionStyle?: CSSProperties
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onFinish: () => void
}

export default function AdminOnboardingDialog({
  isOpen,
  stepIndex,
  totalSteps,
  title,
  body,
  modeLabel = 'Tour guiado',
  primaryLabel,
  skipLabel = 'Saltar',
  secondaryActionLabel,
  onSecondaryAction,
  backActionLabel,
  onBackAction,
  positionStyle,
  onNext,
  onPrev,
  onSkip,
  onFinish
}: AdminOnboardingDialogProps) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const progress = ((stepIndex + 1) / totalSteps) * 100

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onSkip])

  if (!isOpen) return null

  return (
    <div
      className="pointer-events-none fixed z-[75] w-[calc(100%-2rem)] max-w-md"
      style={positionStyle ?? { right: 16, bottom: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="pointer-events-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
          {modeLabel} ({stepIndex + 1}/{totalSteps})
        </p>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{body}</p>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBackAction && backActionLabel && (
              <button
                type="button"
                onClick={onBackAction}
                className="text-sm font-medium text-primary-700 hover:text-primary-800"
              >
                {backActionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {skipLabel}
            </button>
          </div>
          <div className="flex gap-2">
            {onSecondaryAction && secondaryActionLabel && (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="rounded-lg border border-primary-300 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
              >
                {secondaryActionLabel}
              </button>
            )}
            {!isFirst && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onFinish()
                  return
                }
                onNext()
              }}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              {primaryLabel || (isLast ? 'Finalizar tutorial' : 'Siguiente')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
