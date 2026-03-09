interface AdminSettingsSectionProps {
  email?: string | null
  settingsForm: {
    notificationsEnabled: boolean
    notifyNewApplications: boolean
    notifyNewContacts: boolean
    notifySecurityAlerts: boolean
  }
  setSettingsForm: (updater: (prev: AdminSettingsSectionProps['settingsForm']) => AdminSettingsSectionProps['settingsForm']) => void
  settingsSaving: boolean
  settingsLoaded: boolean
  onSaveSettings: () => void
  auditTimeline: {
    items: Array<{
      id: string
      actorEmail: string | null
      action: string
      resourceType: string
      resourceId: string | null
      outcome: 'SUCCESS' | 'DENIED' | 'ERROR'
      metadata: unknown
      createdAt: string
    }>
    loading: boolean
    error: string | null
    pagination: {
      page: number
      totalPages: number
      total: number
    }
    filterOptions: {
      actorEmails: string[]
      actions: string[]
      resourceTypes: string[]
    }
    filters: {
      actorEmail: string
      action: string
      resourceType: string
      dateFrom: string
      dateTo: string
    }
  }
  onAuditFilterChange: (
    key: 'actorEmail' | 'action' | 'resourceType' | 'dateFrom' | 'dateTo',
    value: string
  ) => void
  onAuditPageChange: (page: number) => void
  onReloadAuditTimeline: () => void
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  ariaLabel
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-primary-500' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function AdminSettingsSection({
  email,
  settingsForm,
  setSettingsForm,
  settingsSaving,
  settingsLoaded,
  onSaveSettings,
  auditTimeline,
  onAuditFilterChange,
  onAuditPageChange,
  onReloadAuditTimeline
}: AdminSettingsSectionProps) {
  const outcomeLabel = {
    SUCCESS: 'Correcto',
    DENIED: 'Denegado',
    ERROR: 'Error'
  }

  const outcomeBadgeClass = {
    SUCCESS: 'bg-green-100 text-green-800',
    DENIED: 'bg-yellow-100 text-yellow-800',
    ERROR: 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      <div className="ds-surface overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display text-lg font-semibold text-gray-900">Configuración de cuenta</h2>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{email ?? 'No disponible'}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Modelo de acceso</p>
            <p className="text-sm font-medium text-gray-900">Multi-admin básico (1-5 administradores)</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 md:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Seguridad de acceso</p>
            <p className="text-sm text-gray-700">Gestiona el cambio de contraseña desde el flujo seguro de recuperación.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href="/admin/forgot-password" className="inline-flex min-h-11 items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                Cambiar contraseña
              </a>
              <span className="text-xs text-gray-500">Sesión activa por JWT (8h) y cookies seguras.</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Preferencias de notificaciones</p>
            <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Habilitar notificaciones del panel</span>
              <ToggleSwitch
                checked={settingsForm.notificationsEnabled}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notificationsEnabled: next }))}
                ariaLabel="Habilitar notificaciones del panel"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Nuevas postulaciones</span>
              <ToggleSwitch
                checked={settingsForm.notifyNewApplications}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifyNewApplications: next }))}
                disabled={!settingsForm.notificationsEnabled}
                ariaLabel="Nuevas postulaciones"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Nuevos contactos</span>
              <ToggleSwitch
                checked={settingsForm.notifyNewContacts}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifyNewContacts: next }))}
                disabled={!settingsForm.notificationsEnabled}
                ariaLabel="Nuevos contactos"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Alertas de seguridad</span>
              <ToggleSwitch
                checked={settingsForm.notifySecurityAlerts}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifySecurityAlerts: next }))}
                disabled={!settingsForm.notificationsEnabled}
                ariaLabel="Alertas de seguridad"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={onSaveSettings} disabled={settingsSaving || !settingsLoaded} className="min-h-11 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                {settingsSaving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <details className="ds-surface overflow-hidden group">
        <summary className="list-none cursor-pointer px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-900">Actividad técnica (opcional)</h2>
              <p className="mt-1 text-sm text-gray-600">
                Este bloque es para soporte y diagnóstico. En uso diario no hace falta abrirlo.
              </p>
            </div>
            <span className="text-gray-500 transition-transform group-open:rotate-180">⌄</span>
          </div>
        </summary>

        <div className="border-t border-gray-100 p-4 sm:p-6 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onReloadAuditTimeline}
              disabled={auditTimeline.loading}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {auditTimeline.loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <select
              value={auditTimeline.filters.actorEmail}
              onChange={(event) => onAuditFilterChange('actorEmail', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Todos los usuarios</option>
              {auditTimeline.filterOptions.actorEmails.map((actorEmail) => (
                <option key={actorEmail} value={actorEmail}>
                  {actorEmail}
                </option>
              ))}
            </select>

            <select
              value={auditTimeline.filters.action}
              onChange={(event) => onAuditFilterChange('action', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Todas las acciones</option>
              {auditTimeline.filterOptions.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <select
              value={auditTimeline.filters.resourceType}
              onChange={(event) => onAuditFilterChange('resourceType', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Todas las entidades</option>
              {auditTimeline.filterOptions.resourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {resourceType}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={auditTimeline.filters.dateFrom}
              onChange={(event) => onAuditFilterChange('dateFrom', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />

            <input
              type="date"
              value={auditTimeline.filters.dateTo}
              onChange={(event) => onAuditFilterChange('dateTo', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          {auditTimeline.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {auditTimeline.error}
            </div>
          )}

          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full min-w-[840px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Acción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resultado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditTimeline.loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-center text-gray-500">
                      Cargando eventos de auditoría...
                    </td>
                  </tr>
                ) : auditTimeline.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-sm text-center text-gray-500">
                      No hay eventos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  auditTimeline.items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(entry.createdAt).toLocaleString('es-AR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{entry.actorEmail ?? 'Sistema'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {entry.resourceType}
                        {entry.resourceId ? ` (${entry.resourceId.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${outcomeBadgeClass[entry.outcome]}`}>
                          {outcomeLabel[entry.outcome]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[320px]">
                        <code className="block overflow-hidden text-ellipsis whitespace-nowrap">
                          {entry.metadata ? JSON.stringify(entry.metadata) : '-'}
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {auditTimeline.pagination.total} eventos totales
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAuditPageChange(auditTimeline.pagination.page - 1)}
                disabled={auditTimeline.pagination.page <= 1 || auditTimeline.loading}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-600">
                Página {auditTimeline.pagination.page} / {auditTimeline.pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => onAuditPageChange(auditTimeline.pagination.page + 1)}
                disabled={
                  auditTimeline.pagination.page >= auditTimeline.pagination.totalPages || auditTimeline.loading
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}
