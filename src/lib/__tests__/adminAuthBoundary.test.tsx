// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }))

vi.mock('next-auth/react', () => ({
  useSession: useSessionMock,
  signOut: vi.fn()
}))

import { AdminAuthModeProvider, useAdminAuth } from '@/app/admin/auth-mode-provider'

function AuthModeOutput() {
  const { springAuthEnabled, status } = useAdminAuth()
  return <output>{`${springAuthEnabled}:${status}`}</output>
}

describe('AdminDashboard auth-mode boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the server-provided Spring mode without invoking NextAuth in the browser', () => {
    render(
      <AdminAuthModeProvider springAuthEnabled>
        <AuthModeOutput />
      </AdminAuthModeProvider>
    )

    expect(screen.getByText('true:authenticated')).toBeTruthy()
    expect(useSessionMock).not.toHaveBeenCalled()
  })

  it('retains NextAuth only when the server selects legacy mode', () => {
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })

    render(
      <AdminAuthModeProvider springAuthEnabled={false}>
        <AuthModeOutput />
      </AdminAuthModeProvider>
    )

    expect(screen.getByText('false:unauthenticated')).toBeTruthy()
    expect(useSessionMock).toHaveBeenCalledOnce()
  })
})
