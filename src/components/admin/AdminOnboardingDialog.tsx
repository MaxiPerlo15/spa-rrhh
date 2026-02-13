'use client'

import { useEffect, useMemo, useState } from 'react'

interface AdminOnboardingDialogProps {
  isOpen: boolean
  onComplete: () => void
  onClose: () => void
}

const STEPS = [
  {
    title: 'Bienvenido al panel',
    body: 'Aquí gestionas vacantes, postulaciones y mensajes de contacto desde una sola vista.'
  },
  {
    title: 'Pestaña Vacantes',
    body: 'Crea, edita, activa o cierra vacantes. Solo las activas se muestran en el sitio público.'
  },
  {
    title: 'Pestaña Postulaciones',
    body: 'Filtra candidaturas por estado, revisa detalle y descarga CV para seguimiento.'
  },
  {
    title: 'Pestaña Contactos',
    body: 'Gestiona consultas entrantes y marca su estado para mantener orden operativo.'
  }
]

export default function AdminOnboardingDialog({ isOpen, onComplete, onClose }: AdminOnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    const frame = window.requestAnimationFrame(() => {
      setStepIndex(0)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1
  const progress = useMemo(() => ((stepIndex + 1) / STEPS.length) * 100, [stepIndex])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-600">
          Tutorial inicial ({stepIndex + 1}/{STEPS.length})
        </p>
        <h2 className="text-2xl font-bold text-gray-900">{STEPS[stepIndex].title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{STEPS[stepIndex].body}</p>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Cerrar por ahora
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onComplete()
                  return
                }
                setStepIndex((prev) => prev + 1)
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
