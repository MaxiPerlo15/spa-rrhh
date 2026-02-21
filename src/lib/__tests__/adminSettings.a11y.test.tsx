// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import AdminSettingsSection from '@/components/admin/sections/AdminSettingsSection'

function SettingsFixture() {
  const [settingsForm, setSettingsForm] = useState({
    notificationsEnabled: true,
    notifyNewApplications: true,
    notifyNewContacts: true,
    notifySecurityAlerts: true
  })

  return (
    <AdminSettingsSection
      email="admin@spa.com"
      settingsForm={settingsForm}
      setSettingsForm={setSettingsForm}
      settingsSaving={false}
      settingsLoaded
      onSaveSettings={() => undefined}
      auditTimeline={{
        items: [],
        loading: false,
        error: null,
        pagination: { page: 1, totalPages: 1, total: 0 },
        filterOptions: { actorEmails: [], actions: [], resourceTypes: [] },
        filters: {
          actorEmail: '',
          action: '',
          resourceType: '',
          dateFrom: '',
          dateTo: ''
        }
      }}
      onAuditFilterChange={() => undefined}
      onAuditPageChange={() => undefined}
      onReloadAuditTimeline={() => undefined}
    />
  )
}

describe('AdminSettingsSection a11y', () => {
  it('renderiza switches con nombres accesibles específicos y cambia aria-checked', () => {
    render(<SettingsFixture />)

    const notificationsSwitch = screen.getByRole('switch', { name: 'Habilitar notificaciones del panel' })
    const applicationsSwitch = screen.getByRole('switch', { name: 'Nuevas postulaciones' })
    const contactsSwitch = screen.getByRole('switch', { name: 'Nuevos contactos' })
    const securitySwitch = screen.getByRole('switch', { name: 'Alertas de seguridad' })

    expect(notificationsSwitch.getAttribute('aria-checked')).toBe('true')
    expect(applicationsSwitch.getAttribute('aria-checked')).toBe('true')
    expect(contactsSwitch.getAttribute('aria-checked')).toBe('true')
    expect(securitySwitch.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(applicationsSwitch)
    expect(applicationsSwitch.getAttribute('aria-checked')).toBe('false')
  })
})
