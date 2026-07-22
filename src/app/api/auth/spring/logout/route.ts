import { NextResponse } from 'next/server'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

function forwardSetCookie(upstream: Response, response: NextResponse) {
  const setCookie = upstream.headers.get('Set-Cookie')
  if (setCookie) response.headers.set('Set-Cookie', setCookie)
}

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
    forwardSetCookie(upstream, response)
    return response
  } catch {
    return NextResponse.json({ error: 'Spring authentication is unavailable' }, { status: 503 })
  }
}
