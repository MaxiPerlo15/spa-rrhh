/**
 * Admin Header Component
 * Barra superior del panel administrativo con navegación y acciones
 */

'use client'

import { useEffect, useRef, useState } from 'react'

interface AdminHeaderProps {
  userEmail?: string
  onSignOut: () => void
  onOpenFullTutorial: () => void
  onOpenSectionTutorial: () => void
  onOpenNotifications: () => void
  unreadNotifications?: number
}

export default function AdminHeader({
  userEmail,
  onSignOut,
  onOpenFullTutorial,
  onOpenSectionTutorial,
  onOpenNotifications,
  unreadNotifications = 0
}: AdminHeaderProps) {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isHelpMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsHelpMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isHelpMenuOpen])

  return (
    <header className= "bg-primary-600 shadow-sm sticky top-0 z-10">
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
              <button
                onClick={onOpenNotifications}
                className="relative w-full sm:w-auto px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium text-sm"
              >
                Notificaciones
                {unreadNotifications > 0 && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-primary-900">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <div className="relative w-full sm:w-auto" ref={menuRef}>
                <button
                  onClick={() => setIsHelpMenuOpen((prev) => !prev)}
                  className="w-full sm:w-auto px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium text-sm"
                >
                  Ayuda
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
                      Ver tutorial de la sección
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onSignOut}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
