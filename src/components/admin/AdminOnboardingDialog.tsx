'use client'

interface AdminOnboardingDialogProps {
  isOpen: boolean
  stepIndex: number
  totalSteps: number
  title: string
  body: string
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
  onNext,
  onPrev,
  onSkip,
  onFinish
}: AdminOnboardingDialogProps) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const progress = ((stepIndex + 1) / totalSteps) * 100

  if (!isOpen) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[75] w-[calc(100%-2rem)] max-w-md">
      <div className="pointer-events-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
          Tour guiado ({stepIndex + 1}/{totalSteps})
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
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Saltar tutorial
          </button>
          <div className="flex gap-2">
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
              {isLast ? 'Finalizar tutorial' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
