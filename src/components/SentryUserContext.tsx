'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

/**
 * Componente que sincroniza el usuario autenticado con Sentry
 * Solo trackea admins (usuarios con sesión de NextAuth)
 */
export function SentryUserContext() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.id) {
      // Configurar usuario en Sentry para contexto de errores
      Sentry.setUser({
        id: session.user.id,
        username: 'admin-user'
      })

      // Tag para filtrar errores de admins
      Sentry.setTag('user_role', 'admin')
      Sentry.setTag('authenticated', 'true')
      
      // Debug en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('[Sentry] User context set for admin session')
      }
    } else {
      // Limpiar usuario cuando cierra sesión
      Sentry.setUser(null)
      Sentry.setTag('authenticated', 'false')
    }
  }, [session])

  return null // No renderiza nada
}
