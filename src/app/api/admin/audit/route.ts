import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { adminAuditListQuerySchema, formatValidationError } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization instanceof Response) return authorization

  const validation = adminAuditListQuerySchema.safeParse({
    actorEmail: request.nextUrl.searchParams.get('actorEmail') ?? undefined,
    action: request.nextUrl.searchParams.get('action') ?? undefined,
    resourceType: request.nextUrl.searchParams.get('resourceType') ?? undefined,
    dateFrom: request.nextUrl.searchParams.get('dateFrom') ?? undefined,
    dateTo: request.nextUrl.searchParams.get('dateTo') ?? undefined,
    page: request.nextUrl.searchParams.get('page') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit') ?? undefined
  })
  if (!validation.success) return json(formatValidationError(validation.error), 400)

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(validation.data)) {
    if (value !== undefined) query.set(key, String(value))
  }

  return proxy(request, `/api/v1/admin/audit?${query}`, authorization.setCookie)
}

async function proxy(request: NextRequest, path: string, setCookie?: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return json({ error: 'Spring backend not configured' }, 503)

  try {
    const cookie = setCookie?.split(';', 1)[0] ?? request.headers.get('cookie')
    const response = await fetch(`${backendUrl}${path}`, {
      cache: 'no-store',
      headers: {
        ...getSpringBackendHeaders(),
        ...(cookie ? { Cookie: cookie } : {})
      }
    })

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        ...NO_STORE_HEADERS,
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
        ...(setCookie ? { 'Set-Cookie': setCookie } : {})
      }
    })
  } catch (error) {
    logger.error('Spring backend unavailable for admin audit', error)
    return json({ error: 'Spring backend unavailable' }, 503)
  }
}

function json(body: unknown, status: number, setCookie?: string) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...(setCookie ? { 'Set-Cookie': setCookie } : {}) }
  })
}

async function authorize(request: NextRequest) {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return json({ error: 'No autorizado' }, 401)

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') return json({ error: 'No autorizado' }, 401, session.setCookie)
  if (session.state === 'forbidden') return json({ error: 'No autorizado' }, 403)
  if (session.state === 'unavailable') return json({ error: 'Spring backend unavailable' }, 503)
  return { setCookie: session.setCookie }
}
