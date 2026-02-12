'use client'

import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  closeOnBackdropClick?: boolean
}

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  closeOnBackdropClick = true
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Prevent background scroll
    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onCancel])

  const styles = {
    danger: {
      icon: '⚠️',
      accent: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      icon: '⚠️',
      accent: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      icon: 'ℹ️',
      accent: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in p-4"
      onClick={(event) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl leading-none" aria-hidden="true">
              {styles[type].icon}
            </span>
            <h3 id="confirm-dialog-title" className={`text-xl font-bold ${styles[type].accent}`}>
              {title}
            </h3>
          </div>
          <p className="text-gray-600 whitespace-pre-line leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-5">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2 font-medium text-white transition-colors focus:outline-none focus:ring-2 ${styles[type].button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
