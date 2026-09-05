import { NextResponse } from 'next/server'
import { relaySpringCookies } from '@/lib/server/adminBffBoundary'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

export async function POST(request: Request) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return NextResponse.json({ error: 'Spring authentication is unavailable' }, { status: 503 })

  try {
    const upstream = await fetch(`${backendUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: request.headers.get('Cookie') ?? '',
        ...getSpringBackendHeaders()
      },
      cache: 'no-store'
    })
    const response = new NextResponse(null, { status: upstream.status })
    relaySpringCookies(response, upstream.headers)
    if (upstream.status === 204) {
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
      response.headers.append('Set-Cookie', `SESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`)
    }
    return response
  } catch {
    return NextResponse.json({ error: 'Spring authentication is unavailable' }, { status: 503 })
  }
}
