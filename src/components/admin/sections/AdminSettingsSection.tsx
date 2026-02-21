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
}

function ToggleSwitch({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Cambiar preferencia"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary-500' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
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
  onSaveSettings
}: AdminSettingsSectionProps) {
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
            <p className="text-sm font-medium text-gray-900">Single-admin (cuenta única)</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 md:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Seguridad de acceso</p>
            <p className="text-sm text-gray-700">Gestiona el cambio de contraseña desde el flujo seguro de recuperación.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href="/admin/forgot-password" className="inline-flex px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
                Cambiar contraseña
              </a>
              <span className="text-xs text-gray-500">Sesión activa por JWT (8h) y cookies seguras.</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Preferencias de notificaciones</p>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Habilitar notificaciones del panel</span>
              <ToggleSwitch
                checked={settingsForm.notificationsEnabled}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notificationsEnabled: next }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Nuevas postulaciones</span>
              <ToggleSwitch
                checked={settingsForm.notifyNewApplications}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifyNewApplications: next }))}
                disabled={!settingsForm.notificationsEnabled}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Nuevos contactos</span>
              <ToggleSwitch
                checked={settingsForm.notifyNewContacts}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifyNewContacts: next }))}
                disabled={!settingsForm.notificationsEnabled}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>Alertas de seguridad</span>
              <ToggleSwitch
                checked={settingsForm.notifySecurityAlerts}
                onChange={(next) => setSettingsForm((prev) => ({ ...prev, notifySecurityAlerts: next }))}
                disabled={!settingsForm.notificationsEnabled}
              />
            </label>
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={onSaveSettings} disabled={settingsSaving || !settingsLoaded} className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
                {settingsSaving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
