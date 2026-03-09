/**
 * Admin Tabs Component
 * Navegación por pestañas del panel administrativo
 */

'use client'
import AppIcon from '@/components/ui/AppIcon'

export type AdminTab = 'vacancies' | 'applications' | 'contacts' | 'settings'

interface TabButtonProps {
  isActive: boolean
  onClick: () => void
  icon: Parameters<typeof AppIcon>[0]['name']
  label: string
  mobileLabel?: string
  badge?: number
  compact?: boolean
  iconOnly?: boolean
}

function TabButton({
  isActive,
  onClick,
  icon,
  label,
  mobileLabel,
  badge,
  compact = false,
  iconOnly = false
}: TabButtonProps) {
  const effectiveLabel = compact ? (mobileLabel ?? label) : label
  return (
    <button
      onClick={onClick}
      className={`min-w-0 shrink-0 flex items-center justify-center gap-2 ${
        compact ? 'min-h-11 min-w-11 px-2 py-2 text-[13px]' : 'px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base'
      } ${iconOnly ? 'relative' : ''} font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        isActive
          ? 'bg-primary-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={effectiveLabel}
    >
      <span className={compact ? 'text-base' : 'text-xl'}>
        <AppIcon name={icon} className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
      {!iconOnly && <span className="truncate">{effectiveLabel}</span>}
      {badge !== undefined && badge > 0 && (
        <span className={`${iconOnly ? 'absolute -top-1 -right-1' : 'ml-1'} px-1.5 py-0.5 text-[11px] rounded-full ${
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
  }
}

export default function AdminTabs({ activeTab, onTabChange, className = '', stats = {} }: AdminTabsProps) {
  return (
    <div
      data-tour="tabs"
      className={`md:bg-white md:rounded-lg md:shadow md:p-2 md:mb-8 md:overflow-hidden ${className}`}
    >
      <nav
        aria-label="Navegación principal del panel admin"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur"
      >
        <div className="mx-auto max-w-7xl grid grid-cols-4 gap-2">
        <TabButton
          isActive={activeTab === 'vacancies'}
          onClick={() => onTabChange('vacancies')}
          icon="briefcase"
          label="Vacantes"
          mobileLabel="Vacantes"
          badge={stats.activeVacancies}
          compact
          iconOnly
        />
        <TabButton
          isActive={activeTab === 'applications'}
          onClick={() => onTabChange('applications')}
          icon="file"
          label="Postulaciones"
          mobileLabel="Postulac."
          badge={stats.pendingApplications}
          compact
          iconOnly
        />
        <TabButton
          isActive={activeTab === 'contacts'}
          onClick={() => onTabChange('contacts')}
          icon="mail"
          label="Contactos"
          mobileLabel="Contactos"
          badge={stats.pendingContacts}
          compact
          iconOnly
        />
        <TabButton
          isActive={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
          icon="settings"
          label="Configuración"
          mobileLabel="Ajustes"
          compact
          iconOnly
        />
        </div>
      </nav>

      <div className="hidden md:flex gap-2 overflow-x-auto pb-1">
        <TabButton
          isActive={activeTab === 'vacancies'}
          onClick={() => onTabChange('vacancies')}
          icon="briefcase"
          label="Vacantes"
          badge={stats.activeVacancies}
        />
        <TabButton
          isActive={activeTab === 'applications'}
          onClick={() => onTabChange('applications')}
          icon="file"
          label="Postulaciones"
          badge={stats.pendingApplications}
        />
        <TabButton
          isActive={activeTab === 'contacts'}
          onClick={() => onTabChange('contacts')}
          icon="mail"
          label="Contactos"
          badge={stats.pendingContacts}
        />
      </div>
    </div>
  )
}
