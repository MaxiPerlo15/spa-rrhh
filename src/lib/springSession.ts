export type SpringSessionUser = {
  userId: string
  email: string
  nombreUsuario: string
  rol: { id: string; nombre: string; permisos: string[] }
}

export type SpringSession =
  | { state: 'authorized'; user: SpringSessionUser; setCookie?: string }
  | { state: 'anonymous'; setCookie?: string }
  | { state: 'forbidden'; setCookie?: string }
  | { state: 'unavailable' }

const ADMIN_ACCESS = 'admin:access'

function sessionCookie(headers: Headers): string | undefined {
  const responseHeaders = headers as Headers & { getSetCookie?: () => string[] }
  const cookies = responseHeaders.getSetCookie?.() ?? [headers.get('set-cookie')]
  return cookies.find((cookie): cookie is string => Boolean(cookie?.startsWith('SESSIONID=')))
}

function isSpringSessionUser(value: unknown): value is SpringSessionUser {
  if (!value || typeof value !== 'object') return false

  const user = value as Record<string, unknown>
  const role = user.rol
  if (!role || typeof role !== 'object') return false

  const roleData = role as Record<string, unknown>
  const permissions = roleData.permisos
  return typeof user.userId === 'string'
    && typeof user.email === 'string'
    && typeof user.nombreUsuario === 'string'
    && typeof roleData.id === 'string'
    && typeof roleData.nombre === 'string'
    && Array.isArray(permissions)
    && permissions.every(permission => typeof permission === 'string')
}

export async function getSpringSession(
  cookieHeader: string
): Promise<SpringSession> {
  if (process.env.SPRING_AUTH_ENABLED !== 'true') {
    return { state: 'unavailable' }
  }

  const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '')
  if (!backendUrl) {
    return { state: 'unavailable' }
  }

  try {
    const response = await fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: { Cookie: cookieHeader },
      credentials: 'omit'
    })

    const updatedSessionCookie = response.headers ? sessionCookie(response.headers) : undefined
    if (response.status === 401) {
      return updatedSessionCookie
        ? { state: 'anonymous', setCookie: updatedSessionCookie }
        : { state: 'anonymous' }
    }
    if (response.status === 403) {
      return updatedSessionCookie
        ? { state: 'forbidden', setCookie: updatedSessionCookie }
        : { state: 'forbidden' }
    }
    if (!response.ok) {
      return { state: 'unavailable' }
    }

    const user: unknown = await response.json()
    if (!isSpringSessionUser(user)) {
      return { state: 'unavailable' }
    }
    if (!user.rol.permisos.includes(ADMIN_ACCESS)) {
      return updatedSessionCookie
        ? { state: 'forbidden', setCookie: updatedSessionCookie }
        : { state: 'forbidden' }
    }
    return updatedSessionCookie
      ? { state: 'authorized', user, setCookie: updatedSessionCookie }
      : { state: 'authorized', user }
  } catch {
    return { state: 'unavailable' }
  }
}
