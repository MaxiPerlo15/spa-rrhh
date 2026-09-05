import { NextResponse } from 'next/server'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

type RelayOptions = {
  path: 'login' | 'logout'
  request: Request
  body?: string
}

function copySetCookie(from: Headers, to: Headers) {
  const headers = from as Headers & { getSetCookie?: () => string[] }
  const cookies = headers.getSetCookie?.() ?? (from.get('set-cookie') ? [from.get('set-cookie')!] : [])

  for (const cookie of cookies) {
    to.append('Set-Cookie', cookie)
  }
}

export async function relaySpringAuth({ path, request, body }: RelayOptions) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    return NextResponse.json({ error: 'spring_auth_unavailable' }, { status: 503 })
  }

  const headers: Record<string, string> = { ...getSpringBackendHeaders() }
  const cookie = request.headers.get('cookie')
  if (cookie) headers.Cookie = cookie
  if (body) headers['Content-Type'] = 'application/json'

  try {
    const springResponse = await fetch(`${backendUrl}/api/v1/auth/${path}`, {
      method: 'POST',
      headers,
      ...(body ? { body } : {}),
      cache: 'no-store',
      credentials: 'omit'
    })

    if (!springResponse.ok) {
      const error = path === 'login' && springResponse.status === 401
        ? 'invalid_credentials'
        : 'spring_auth_failed'
      return NextResponse.json({ error }, { status: springResponse.status })
    }

    const response = path === 'login'
      ? NextResponse.json(await springResponse.json(), { status: springResponse.status })
      : new NextResponse(null, { status: springResponse.status })
    copySetCookie(springResponse.headers, response.headers)
    return response
  } catch {
    return NextResponse.json({ error: 'spring_auth_unavailable' }, { status: 503 })
  }
}
