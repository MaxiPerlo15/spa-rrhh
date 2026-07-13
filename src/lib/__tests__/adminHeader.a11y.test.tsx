// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminHeader from '@/components/admin/AdminHeader'

const notifications = [
  {
    id: 'n1',
    title: 'Nueva postulación',
    message: 'Se recibió una nueva postulación',
    level: 'info' as const,
    createdAt: new Date().toISOString(),
    isRead: false
  }
]

describe('AdminHeader mobile a11y', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(max-width: 767px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  it('expone botones críticos con nombres accesibles y estado expandido de ayuda', async () => {
    render(
      <AdminHeader
        activeTab="vacancies"
        userEmail="admin@spa.com"
        onSignOut={vi.fn()}
        onBackFromSettings={vi.fn()}
        onOpenFullTutorial={vi.fn()}
        onOpenSectionTutorial={vi.fn()}
        onOpenNotifications={vi.fn()}
        onOpenSettings={vi.fn()}
        notifications={notifications}
        onDeleteNotification={vi.fn()}
        onToggleNotificationRead={vi.fn()}
        onMarkAllNotificationsAsRead={vi.fn()}
        onClearReadNotifications={vi.fn()}
        onNotificationAction={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Notificaciones del panel' }).length).toBeGreaterThan(0)
    })

    const helpButton = screen.getAllByRole('button', { name: 'Ayuda del panel' })[1]!
    expect(helpButton.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(helpButton)
    expect(helpButton.getAttribute('aria-expanded')).toBe('true')
  })

  it('abre el panel de notificaciones con semántica de diálogo', async () => {
    render(
      <AdminHeader
        activeTab="vacancies"
        userEmail="admin@spa.com"
        onSignOut={vi.fn()}
        onBackFromSettings={vi.fn()}
        onOpenFullTutorial={vi.fn()}
        onOpenSectionTutorial={vi.fn()}
        onOpenNotifications={vi.fn()}
        onOpenSettings={vi.fn()}
        notifications={notifications}
        onDeleteNotification={vi.fn()}
        onToggleNotificationRead={vi.fn()}
        onMarkAllNotificationsAsRead={vi.fn()}
        onClearReadNotifications={vi.fn()}
        onNotificationAction={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Notificaciones del panel' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Notificaciones del panel' })[1]!)

    const dialog = await screen.findByRole('dialog', { name: 'Notificaciones' })
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('expone la acción de cerrar sesión y permite dispararla', async () => {
    const onSignOut = vi.fn()

    render(
      <AdminHeader
        activeTab="vacancies"
        userEmail="admin@spa.com"
        onSignOut={onSignOut}
        onBackFromSettings={vi.fn()}
        onOpenFullTutorial={vi.fn()}
        onOpenSectionTutorial={vi.fn()}
        onOpenNotifications={vi.fn()}
        onOpenSettings={vi.fn()}
        notifications={notifications}
        onDeleteNotification={vi.fn()}
        onToggleNotificationRead={vi.fn()}
        onMarkAllNotificationsAsRead={vi.fn()}
        onClearReadNotifications={vi.fn()}
        onNotificationAction={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Cerrar sesión del panel' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar sesión del panel' })[0]!)

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
