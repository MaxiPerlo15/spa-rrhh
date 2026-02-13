/**
 * Admin Header Component
 * Barra superior del panel administrativo con navegación y acciones
 */

'use client'

interface AdminHeaderProps {
  userEmail?: string
  onSignOut: () => void
  onHelp: () => void
}

export default function AdminHeader({ userEmail, onSignOut, onHelp }: AdminHeaderProps) {
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
                onClick={onHelp}
                className="w-full sm:w-auto px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors font-medium text-sm"
              >
                Ayuda
              </button>
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
