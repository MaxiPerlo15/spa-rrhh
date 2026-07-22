'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'

type AdminAuthState = {
  session: Session | null
  status: 'authenticated' | 'loading' | 'unauthenticated'
  springAuthEnabled: boolean
}

const AdminAuthContext = createContext<AdminAuthState | null>(null)
const springSession = { user: { email: '' } } as Session

export function AdminAuthModeProvider({
  children,
  springAuthEnabled
}: {
  children: ReactNode
  springAuthEnabled: boolean
}) {
  return springAuthEnabled ? (
    <AdminAuthContext.Provider
      value={{ session: springSession, status: 'authenticated', springAuthEnabled: true }}
    >
      {children}
    </AdminAuthContext.Provider>
  ) : (
    <LegacyAdminAuthProvider>{children}</LegacyAdminAuthProvider>
  )
}

function LegacyAdminAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  return (
    <AdminAuthContext.Provider value={{ session, status, springAuthEnabled: false }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const authState = useContext(AdminAuthContext)

  if (!authState) {
    throw new Error('useAdminAuth must be used within AdminAuthModeProvider')
  }

  return authState
}
