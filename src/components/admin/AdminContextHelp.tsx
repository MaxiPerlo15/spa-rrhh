'use client'

import type { AdminTab } from './AdminTabs'

interface AdminContextHelpProps {
  activeTab: AdminTab
  onOpenTutorial: () => void
}

const TAB_HELP: Record<AdminTab, { title: string; tip: string; action: string }> = {
  vacancies: {
    title: 'Ayuda: Vacantes',
    tip: 'Mantén solo vacantes vigentes como activas para evitar confusión en candidatos.',
    action: 'Revisar estados semanalmente'
  },
  applications: {
    title: 'Ayuda: Postulaciones',
    tip: 'Usa filtros por estado y búsqueda para acelerar screening y seguimiento.',
    action: 'Actualizar estado tras cada revisión'
  },
  contacts: {
    title: 'Ayuda: Contactos',
    tip: 'Marca como respondidos los mensajes atendidos para mantener trazabilidad operativa.',
    action: 'Archivar consultas cerradas'
  },
  settings: {
    title: 'Ayuda: Configuración',
    tip: 'Centraliza alertas y datos de cuenta para revisar el estado operativo del panel.',
    action: 'Revisar notificaciones al iniciar sesión'
  }
}

export default function AdminContextHelp({ activeTab, onOpenTutorial }: AdminContextHelpProps) {
  const content = TAB_HELP[activeTab]

  return (
    <section className="mb-6 rounded-xl border border-primary-100 bg-primary-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary-800">{content.title}</h3>
          <p className="mt-1 text-sm text-primary-700">{content.tip}</p>
          <p className="mt-1 text-xs font-medium text-primary-900">Sugerencia: {content.action}</p>
        </div>
        <button
          type="button"
          onClick={onOpenTutorial}
          className="w-full rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 sm:w-auto"
        >
          Ver tutorial de esta sección
        </button>
      </div>
    </section>
  )
}
