export type SpringSessionUser = {
  userId: string
  email: string
  nombreUsuario: string
  rol: { id: string; nombre: string; permisos: string[] }
}

export async function getSpringSession(
  cookieHeader: string
): Promise<SpringSessionUser | null> {
  if (process.env.SPRING_AUTH_ENABLED !== 'true') {
    return null
  }

  const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '')
  if (!backendUrl) {
    return null
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookieHeader },
      credentials: 'omit'
    })

    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch {
    return null
  }
}
