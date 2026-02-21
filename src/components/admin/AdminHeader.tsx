/**
 * Admin Header Component
 * Barra superior del panel administrativo con navegación y acciones
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
  activeTab: 'vacancies' | 'applications' | 'contacts' | 'settings'
  userEmail?: string
  onSignOut: () => void
  onBackFromSettings: () => void
  onOpenFullTutorial: () => void
  onOpenSectionTutorial: () => void
  onOpenNotifications: () => void
  onOpenSettings: () => void
  notifications: HeaderNotification[]
  pendingNotificationDeleteIds?: string[]
  isNotificationBulkLoading?: boolean
  onDeleteNotification: (notificationId: string) => void
  onToggleNotificationRead: (notificationId: string) => void
  onMarkAllNotificationsAsRead: () => void
  onClearReadNotifications: () => void
  onNotificationAction: (notification: HeaderNotification) => void
  unreadNotifications?: number
}

type NotificationsView = 'unread' | 'read'

export default function AdminHeader({
  activeTab,
  userEmail,
  onSignOut,
  onBackFromSettings,
  onOpenFullTutorial,
  onOpenSectionTutorial,
  onOpenNotifications,
  onOpenSettings,
  notifications,
  pendingNotificationDeleteIds = [],
  isNotificationBulkLoading = false,
  onDeleteNotification,
  onToggleNotificationRead,
  onMarkAllNotificationsAsRead,
  onClearReadNotifications,
  onNotificationAction,
  unreadNotifications = 0
}: AdminHeaderProps) {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false)
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [notificationsView, setNotificationsView] = useState<NotificationsView>('unread')
  const [notificationsReferenceNow, setNotificationsReferenceNow] = useState<number>(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const helpMenuRef = useRef<HTMLDivElement | null>(null)
  const desktopNotificationsMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileNotificationsMenuRef = useRef<HTMLDivElement | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null)

  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const readCount = notifications.length - unreadCount
  const visibleNotifications = notifications.filter((notification) =>
    notificationsView === 'unread' ? !notification.isRead : notification.isRead
  )
  const pendingDeleteSet = useMemo(() => new Set(pendingNotificationDeleteIds), [pendingNotificationDeleteIds])

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

  const isOverlayOpen = isNotificationsMenuOpen || isActionMenuOpen

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

  const closeAllMenus = () => {
    setIsHelpMenuOpen(false)
    setIsNotificationsMenuOpen(false)
    setIsActionMenuOpen(false)
  }

  const openNotifications = () => {
    const willOpen = !isNotificationsMenuOpen
    setIsNotificationsMenuOpen(willOpen)
    setIsHelpMenuOpen(false)
    setIsActionMenuOpen(false)
    if (willOpen) {
      setNotificationsReferenceNow(Date.now())
      setNotificationsView('unread')
      onOpenNotifications()
    }
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches)
    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)
    return () => mediaQuery.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!isHelpMenuOpen && !isNotificationsMenuOpen && !isActionMenuOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      const clickedHelp = helpMenuRef.current?.contains(target)
      const clickedAction = actionMenuRef.current?.contains(target)
      const clickedDesktopNotifications = desktopNotificationsMenuRef.current?.contains(target)
      const clickedMobileNotifications = mobileNotificationsMenuRef.current?.contains(target)

      if (!clickedHelp) setIsHelpMenuOpen(false)
      if (!clickedAction) setIsActionMenuOpen(false)
      if (!clickedDesktopNotifications && !clickedMobileNotifications) setIsNotificationsMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isActionMenuOpen, isHelpMenuOpen, isNotificationsMenuOpen])

  useEffect(() => {
    if (!isHelpMenuOpen && !isNotificationsMenuOpen && !isActionMenuOpen) return

    const handleScroll = () => closeAllMenus()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isActionMenuOpen, isHelpMenuOpen, isNotificationsMenuOpen])

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

  const renderNotificationsPanel = (mobile: boolean) => (
    <div
      ref={notificationsPanelRef}
      role="dialog"
      aria-label="Bandeja de notificaciones"
      className={`rounded-2xl border border-gray-200 bg-white shadow-2xl z-[90] overflow-hidden animate-fade-in ${
        mobile
          ? 'absolute right-0 mt-2 w-[min(23rem,calc(100vw-1rem))] max-h-[65vh]'
          : 'absolute right-0 mt-2 w-[390px] max-w-[95vw] origin-top-right'
      }`}
    >
      <div className="border-b border-gray-100 px-4 py-3 space-y-3 bg-gray-50/80">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
          <div className="text-xs text-gray-500 text-right">
            <span className="font-medium text-gray-900">{notifications.length}</span> totales
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotificationsView('unread')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              notificationsView === 'unread' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Nuevas ({unreadCount})
          </button>
          <button
            onClick={() => setNotificationsView('read')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              notificationsView === 'read' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Leidas ({readCount})
          </button>
        </div>
      </div>

      <div className="max-h-[48vh] overflow-y-auto">
        {visibleNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">i</div>
            <p className="text-sm font-medium text-gray-700">Sin notificaciones.</p>
          </div>
        ) : (
          visibleNotifications.map((notification) => {
            const style = levelStyles[notification.level]
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 border-b border-l-4 border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50 transition-colors ${style.accent}`}
              >
                <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-gray-700 overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatRelativeTimestamp(notification.createdAt)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => onToggleNotificationRead(notification.id)}
                      disabled={isNotificationBulkLoading}
                      className="text-xs font-medium text-primary-700 hover:text-primary-800"
                    >
                      {notification.isRead ? 'No leida' : 'Marcar leida'}
                    </button>
                    {notification.action && (
                      <button
                        onClick={() => onNotificationAction(notification)}
                        disabled={isNotificationBulkLoading}
                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteNotification(notification.id)}
                  disabled={isNotificationBulkLoading || pendingDeleteSet.has(notification.id)}
                  className="shrink-0 rounded-md px-1 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg leading-none"
                  aria-label="Eliminar notificacion"
                >
                  x
                </button>
              </div>
            )
          })
        )}
      </div>

      {(unreadCount > 0 || readCount > 0) && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllNotificationsAsRead}
              disabled={isNotificationBulkLoading}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Marcar todas leidas
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={onClearReadNotifications}
              disabled={isNotificationBulkLoading}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar leidas
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <header className="fixed inset-x-0 top-0 bg-primary-600/98 shadow-sm z-40 backdrop-blur-sm pt-[env(safe-area-inset-top)] md:sticky md:top-0 md:pt-0">
      {isMobileViewport && isOverlayOpen && (
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={closeAllMenus}
          className="fixed inset-0 bg-slate-900/20 z-[80]"
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4">
        <div className="hidden md:flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Panel Administrativo</h1>
            <p className="text-sm text-gray-300 mt-1">Meinardi&Perlo RRHH</p>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="text-right min-w-0">
                <p className="text-sm font-medium text-white truncate max-w-[280px]">{userEmail}</p>
                <p className="text-xs text-gray-300">Administrador</p>
              </div>
            )}

            <div className="relative" ref={desktopNotificationsMenuRef}>
              <button onClick={openNotifications} className="relative h-11 w-11 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center" aria-label="Notificaciones">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-primary-900">{unreadNotifications}</span>
                )}
              </button>
              {isNotificationsMenuOpen && !isMobileViewport && renderNotificationsPanel(false)}
            </div>

            <div className="relative" ref={helpMenuRef}>
              <button onClick={() => { setIsHelpMenuOpen((prev) => !prev); setIsNotificationsMenuOpen(false) }} className="h-11 w-11 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center" aria-label="Ayuda">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
                  <circle cx="12" cy="17" r="1" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </button>
              {isHelpMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl z-[90] overflow-hidden">
                  <button onClick={() => { setIsHelpMenuOpen(false); onOpenFullTutorial() }} className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50">Ver tutorial completo</button>
                  <button onClick={() => { setIsHelpMenuOpen(false); onOpenSectionTutorial() }} className="block w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 border-t border-gray-100">Ver tutorial de la seccion</button>
                </div>
              )}
            </div>

            <button onClick={onOpenSettings} className="h-11 w-11 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center" aria-label="Configuracion">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.1a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.1a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.4-.2.7-.6.6-1V3a2 2 0 1 1 4 0v.1c0 .4.2.8.6 1 .3.2.7.2 1 0a1.65 1.65 0 0 0 1-.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.3.3-.4.8-.3 1.2.1.4.4.7.8.9.4.1.8.2 1.2.1H21a2 2 0 1 1 0 4h-.1a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.5 1z" />
              </svg>
            </button>

            <button onClick={onSignOut} className="h-11 w-11 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center justify-center" aria-label="Cerrar sesión">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-between gap-2 h-11">
          <div className="flex items-center gap-2 min-w-0">
            {activeTab === 'settings' && (
              <button type="button" onClick={onBackFromSettings} className="h-9 w-9 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center" aria-label="Volver">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white leading-tight truncate">Panel Admin</p>
              <p className="text-[11px] text-blue-100/90 leading-none truncate">
                {activeTab === 'vacancies' && 'Vacantes'}
                {activeTab === 'applications' && 'Postulaciones'}
                {activeTab === 'contacts' && 'Contactos'}
                {activeTab === 'settings' && 'Configuración'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={mobileNotificationsMenuRef}>
              <button onClick={openNotifications} className="relative h-9 w-9 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center" aria-label="Notificaciones">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-primary-900">{unreadNotifications}</span>
                )}
              </button>
              {isNotificationsMenuOpen && isMobileViewport && renderNotificationsPanel(true)}
            </div>

            <div className="relative" ref={actionMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsActionMenuOpen((prev) => !prev)
                  setIsNotificationsMenuOpen(false)
                  setIsHelpMenuOpen(false)
                }}
                className="h-9 w-9 bg-white/10 text-white rounded-lg hover:bg-white/20 inline-flex items-center justify-center"
                aria-label="Abrir menú"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {isActionMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white shadow-2xl z-[90] overflow-hidden">
                  {userEmail && <p className="px-4 py-3 text-xs text-gray-500 border-b border-gray-100 truncate">{userEmail}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      onOpenFullTutorial()
                    }}
                    className="w-full text-left px-4 py-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Tutorial completo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      onOpenSectionTutorial()
                    }}
                    className="w-full text-left px-4 py-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 border-t border-gray-100"
                  >
                    Tutorial de esta sección
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      onOpenSettings()
                    }}
                    className="w-full text-left px-4 py-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 border-t border-gray-100"
                  >
                    Configuración
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      onSignOut()
                    }}
                    className="w-full text-left px-4 py-3.5 text-sm font-medium text-red-700 hover:bg-red-50 border-t border-gray-100"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
