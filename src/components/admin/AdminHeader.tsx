/**
 * Admin Header Component
 * Barra superior del panel administrativo con navegación y acciones
 */

'use client'

interface AdminHeaderProps {
  userEmail?: string
  onSignOut: () => void
}

export default function AdminHeader({ userEmail, onSignOut }: AdminHeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
            <p className="text-sm text-gray-600 mt-1">Meinardi&Perlo RRHH</p>
          </div>
          
          <div className="flex items-center gap-4">
            {userEmail && (
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{userEmail}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
            )}
            
            <button
              onClick={onSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
