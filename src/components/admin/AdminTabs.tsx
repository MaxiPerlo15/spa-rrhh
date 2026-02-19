/**
 * Admin Tabs Component
 * Navegación por pestañas del panel administrativo
 */

'use client'

export type AdminTab = 'vacancies' | 'applications' | 'contacts' | 'settings'

interface TabButtonProps {
  isActive: boolean
  onClick: () => void
  icon: string
  label: string
  badge?: number
}

function TabButton({ isActive, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`min-w-fit shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-all ${
        isActive
          ? 'bg-primary-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
          isActive ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

interface AdminTabsProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  className?: string
  stats?: {
    activeVacancies?: number
    pendingApplications?: number
    pendingContacts?: number
    unreadNotifications?: number
  }
}

export default function AdminTabs({ activeTab, onTabChange, className = '', stats = {} }: AdminTabsProps) {
  return (
    <div data-tour="tabs" className={`bg-white rounded-lg shadow p-2 mb-8 ${className}`}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <TabButton
          isActive={activeTab === 'vacancies'}
          onClick={() => onTabChange('vacancies')}
          icon="💼"
          label="Vacantes"
          badge={stats.activeVacancies}
        />
        <TabButton
          isActive={activeTab === 'applications'}
          onClick={() => onTabChange('applications')}
          icon="📝"
          label="Postulaciones"
          badge={stats.pendingApplications}
        />
        <TabButton
          isActive={activeTab === 'contacts'}
          onClick={() => onTabChange('contacts')}
          icon="📧"
          label="Contactos"
          badge={stats.pendingContacts}
        />
        <TabButton
          isActive={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
          icon="⚙️"
          label="Configuración"
          badge={stats.unreadNotifications}
        />
      </div>
    </div>
  )
}
