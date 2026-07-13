'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = useCallback(() => {
    setIsVisible(false)

    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current)
    }

    exitTimerRef.current = setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    // Trigger entrance animation with requestAnimationFrame
    const enterTimer = requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto close
    autoCloseTimerRef.current = setTimeout(scheduleClose, duration)

    return () => {
      cancelAnimationFrame(enterTimer)
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current)
      }
    }
  }, [duration, scheduleClose])

  const styles = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    warning: 'bg-yellow-500 border-yellow-600',
    info: 'bg-blue-500 border-blue-600',
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div
      className={`pointer-events-auto flex w-full items-center gap-3 rounded-lg border-l-4 px-6 py-4 text-white shadow-lg transition-all duration-300 ${
        styles[type]
      } ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      role="alert"
    >
      <span className="text-2xl font-bold">{icons[type]}</span>
      <p className="font-medium">{message}</p>
      <button
        onClick={scheduleClose}
        className="btn-motion ml-4 text-white hover:text-gray-200"
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  )
}
