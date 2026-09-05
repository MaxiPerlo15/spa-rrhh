import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateAdminNotificationSchema } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'
import { relaySpringCookies } from '@/lib/server/adminBffBoundary'

interface RouteParams {
  params: Promise<{ id: string }>
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authorization = await authorize(request)
  if (authorization instanceof Response) return authorization

  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection, authorization.setCookie)

  const id = routeIdSchema.safeParse(await params)
  if (!id.success) return json(formatValidationError(id.error), 400, authorization.setCookie)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Malformed request body' }, 400, authorization.setCookie)
  }

  const validation = updateAdminNotificationSchema.safeParse(body)
  if (!validation.success) return json(formatValidationError(validation.error), 400, authorization.setCookie)

  return proxy(
    request,
    notificationPath(id.data.id),
    { method: 'PATCH', body: JSON.stringify(validation.data) },
    authorization.setCookie
  )
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authorization = await authorize(request)
  if (authorization instanceof Response) return authorization

  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection, authorization.setCookie)

  const id = routeIdSchema.safeParse(await params)
  if (!id.success) return json(formatValidationError(id.error), 400, authorization.setCookie)

  return proxy(request, notificationPath(id.data.id), { method: 'DELETE' }, authorization.setCookie)
}

function notificationPath(id: string) {
  return `/api/v1/admin/notifications/${encodeURIComponent(id)}`
}

async function proxy(request: NextRequest, path: string, init: RequestInit, setCookie?: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return json({ error: 'Spring backend not configured' }, 503, setCookie)

  try {
    const cookie = setCookie?.split(';', 1)[0] ?? request.headers.get('cookie')
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...getSpringBackendHeaders(),
        ...(cookie ? { Cookie: cookie } : {})
      }
    })
    return relaySpringCookies(
      relaySpringCookies(
        new NextResponse(await response.text(), {
          status: response.status,
          headers: {
            ...NO_STORE_HEADERS,
            'Content-Type': response.headers.get('Content-Type') ?? 'application/json'
          }
        }),
        setCookie
      ),
      response.headers
    )
  } catch (error) {
    logger.error('Spring backend unavailable for admin notification item', error)
    return json({ error: 'Spring backend unavailable' }, 503, setCookie)
  }
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

function json(body: unknown, status: number, setCookie?: string) {
  return relaySpringCookies(
    NextResponse.json(body, {
      status,
      headers: NO_STORE_HEADERS
    }),
    setCookie
  )
}

function withNoStore(response: Response, setCookie?: string) {
  response.headers.set('Cache-Control', 'no-store')
  return relaySpringCookies(response, setCookie)
}
