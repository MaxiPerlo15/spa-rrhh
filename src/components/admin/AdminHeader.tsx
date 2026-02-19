/**
 * Admin Header Component
 * Barra superior del panel administrativo con navegación y acciones
 */

'use client'

import { useEffect, useRef, useState } from 'react'

interface HeaderNotification {
  id: string
  title: string
  message: string
  level: 'info' | 'success' | 'warning'
  createdAt: string
  isRead: boolean
  action?: {
    label: string
    type: 'VACANCY' | 'APPLICATION' | 'CONTACT'
    resourceId: string
  }
}

interface AdminHeaderProps {
  userEmail?: string
  onSignOut: () => void
  onOpenFullTutorial: () => void
  onOpenSectionTutorial: () => void
  onOpenNotifications: () => void
  onOpenSettings: () => void
  notifications: HeaderNotification[]
  onDeleteNotification: (notificationId: string) => void
  onToggleNotificationRead: (notificationId: string) => void
  onMarkAllNotificationsAsRead: () => void
  onClearReadNotifications: () => void
  onNotificationAction: (notification: HeaderNotification) => void
  unreadNotifications?: number
}

type NotificationsView = 'unread' | 'read'

export default function AdminHeader({
  userEmail,
  onSignOut,
  onOpenFullTutorial,
  onOpenSectionTutorial,
  onOpenNotifications,
  onOpenSettings,
  notifications,
  onDeleteNotification,
  onToggleNotificationRead,
  onMarkAllNotificationsAsRead,
  onClearReadNotifications,
  onNotificationAction,
  unreadNotifications = 0
}: AdminHeaderProps) {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [notificationsView, setNotificationsView] = useState<NotificationsView>('unread')
  const [notificationsReferenceNow, setNotificationsReferenceNow] = useState<number>(0)

  const helpMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const readCount = notifications.length - unreadCount
  const visibleNotifications = notifications.filter((notification) =>
    notificationsView === 'unread' ? !notification.isRead : notification.isRead
  )

  const levelStyles: Record<HeaderNotification['level'], { accent: string; dot: string }> = {
    info: {
      accent: 'border-l-primary-300',
      dot: 'bg-primary-500'
    },
    success: {
      accent: 'border-l-green-300',
      dot: 'bg-green-500'
    },
    warning: {
      accent: 'border-l-amber-300',
      dot: 'bg-amber-500'
    }
  }

  const formatRelativeTimestamp = (value: string) => {
    const timestamp = new Date(value).getTime()
    const referenceNow = notificationsReferenceNow || timestamp
    const diffMs = referenceNow - timestamp
    const diffMinutes = Math.floor(diffMs / 60000)

    if (diffMinutes < 1) return 'hace instantes'
    if (diffMinutes < 60) return `hace ${diffMinutes} min`

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `hace ${diffHours} h`

    const diffDays = Math.floor(diffHours / 24)
    return `hace ${diffDays} d`
  }

  useEffect(() => {
    if (!isHelpMenuOpen && !isNotificationsMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false)
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setIsNotificationsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isHelpMenuOpen, isNotificationsMenuOpen])

  useEffect(() => {
    if (!isNotificationsMenuOpen) return

    const panel = notificationsPanelRef.current
    if (!panel) return

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
    focusableElements[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsNotificationsMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const nextFocusableElements = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
      if (nextFocusableElements.length === 0) return

      const first = nextFocusableElements[0]
      const last = nextFocusableElements[nextFocusableElements.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isNotificationsMenuOpen, notificationsView, visibleNotifications.length])

  return (
    <header className="bg-primary-600 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Panel Administrativo</h1>
            <p className="text-sm text-gray-300 mt-1">Meinardi&Perlo RRHH</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            {userEmail && (
              <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-white">{userEmail}</p>
                <p className="text-xs text-gray-300">Administrador</p>
              </div>
            )}

            <div className="flex w-full gap-2 sm:w-auto">
              <div className="relative w-full sm:w-auto" ref={notificationsMenuRef}>
                <button
                  onClick={() => {
                    const willOpen = !isNotificationsMenuOpen
                    setIsNotificationsMenuOpen(willOpen)
                    setIsHelpMenuOpen(false)
                    if (willOpen) {
                      setNotificationsReferenceNow(new Date().getTime())
                      setNotificationsView('unread')
                      onOpenNotifications()
                    }
                  }}
                  className="relative w-full sm:w-auto px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-150"
                  aria-label="Notificaciones"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-primary-900 animate-pulse-subtle">
                      {unreadNotifications}
                    </span>
                  )}
                  <span className="sr-only" aria-live="polite">
                    {unreadNotifications} notificaciones nuevas
                  </span>
                </button>

                {isNotificationsMenuOpen && (
                  <div
                    ref={notificationsPanelRef}
                    role="dialog"
                    aria-label="Bandeja de notificaciones"
                    className="absolute right-0 mt-2 w-[370px] max-w-[95vw] rounded-xl border border-gray-200 bg-white shadow-xl z-20 overflow-hidden animate-fade-in origin-top-right"
                  >
                    <div className="border-b border-gray-100 px-4 py-3 space-y-3 bg-gray-50/60">
                      <div className="flex items-center justify-between gap-3">
                        <div />
                        <div className="text-xs text-gray-500 text-right">
                          <span className="font-medium text-gray-900">{notifications.length}</span> totales
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNotificationsView('unread')}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            notificationsView === 'unread'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Nuevas ({unreadCount})
                        </button>
                        <button
                          onClick={() => setNotificationsView('read')}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            notificationsView === 'read'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Leidas ({readCount})
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={onMarkAllNotificationsAsRead}
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Marcar todas leidas
                          </button>
                        )}
                        {readCount > 0 && (
                          <button
                            onClick={onClearReadNotifications}
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Limpiar leidas
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {visibleNotifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <span className="text-sm">i</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            {notificationsView === 'unread'
                              ? 'No hay nuevas notificaciones.'
                              : 'No hay notificaciones leidas.'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Aqui veras eventos del panel.</p>
                        </div>
                      ) : (
                        visibleNotifications.map((notification) => {
                          const style = levelStyles[notification.level]
                          return (
                            <div
                              key={notification.id}
                              className={`flex items-start gap-3 border-b border-l-4 border-gray-100 px-4 py-2.5 last:border-b-0 hover:bg-gray-50 transition-colors ${style.accent}`}
                            >
                              <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
                                <p className="mt-0.5 text-sm text-gray-700 overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                  <span>{formatRelativeTimestamp(notification.createdAt)}</span>
                                  <span className="text-gray-300">•</span>
                                  <span>{new Date(notification.createdAt).toLocaleTimeString('es-AR')}</span>
                                </p>
                                <button
                                  onClick={() => onToggleNotificationRead(notification.id)}
                                  className="mt-1.5 text-xs font-medium text-primary-700 hover:text-primary-800 transition-colors"
                                >
                                  {notification.isRead ? 'Marcar como no leida' : 'Marcar como leida'}
                                </button>
                                {notification.action && (
                                  <button
                                    onClick={() => onNotificationAction(notification)}
                                    className="mt-1.5 ml-2 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors"
                                  >
                                    {notification.action.label}
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => onDeleteNotification(notification.id)}
                                className="shrink-0 rounded-md px-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-lg leading-none"
                                aria-label="Eliminar notificacion"
                              >
                                x
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative w-full sm:w-auto" ref={helpMenuRef}>
                <button
                  onClick={() => {
                    setIsHelpMenuOpen((prev) => !prev)
                    setIsNotificationsMenuOpen(false)
                  }}
                  className="w-full sm:w-auto px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Ayuda"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
                    <circle cx="12" cy="17" r="1" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
                {isHelpMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl z-20 overflow-hidden">
                    <button
                      onClick={() => {
                        setIsHelpMenuOpen(false)
                        onOpenFullTutorial()
                      }}
                      className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
                    >
                      Ver tutorial completo
                    </button>
                    <button
                      onClick={() => {
                        setIsHelpMenuOpen(false)
                        onOpenSectionTutorial()
                      }}
                      className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 border-t border-gray-100"
                    >
                      Ver tutorial de la seccion
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onOpenSettings}
                className="w-full sm:w-auto px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Configuracion"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.1a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.1a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.4-.2.7-.6.6-1V3a2 2 0 1 1 4 0v.1c0 .4.2.8.6 1 .3.2.7.2 1 0a1.65 1.65 0 0 0 1-.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.3.3-.4.8-.3 1.2.1.4.4.7.8.9.4.1.8.2 1.2.1H21a2 2 0 1 1 0 4h-.1a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.5 1z" />
                </svg>
              </button>

              <button
                onClick={onSignOut}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Cerrar Sesion
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
