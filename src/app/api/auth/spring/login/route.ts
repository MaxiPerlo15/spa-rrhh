import { NextResponse } from 'next/server'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

function forwardSetCookie(upstream: Response, response: NextResponse) {
  const setCookie = upstream.headers.get('Set-Cookie')
  if (setCookie) response.headers.set('Set-Cookie', setCookie)
}

export async function POST(request: Request) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return NextResponse.json({ error: 'Spring authentication is unavailable' }, { status: 503 })

  let credentials: unknown
  try {
    credentials = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getSpringBackendHeaders()
      },
      body: JSON.stringify(credentials),
      cache: 'no-store'
    })
    const response = upstream.ok
      ? NextResponse.json(await upstream.json(), { status: upstream.status })
      : NextResponse.json({ error: 'Invalid credentials' }, { status: upstream.status })
    forwardSetCookie(upstream, response)
    return response
  } catch {
    return NextResponse.json({ error: 'Spring authentication is unavailable' }, { status: 503 })
  }
}
