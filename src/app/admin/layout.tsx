import { isSpringAuthEnabled } from '@/lib/server/springBackend'
import type { ReactNode } from 'react'
import { AdminAuthModeProvider } from './auth-mode-provider'

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminAuthModeProvider springAuthEnabled={isSpringAuthEnabled()}>{children}</AdminAuthModeProvider>
}
