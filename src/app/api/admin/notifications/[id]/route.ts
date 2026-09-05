import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateAdminNotificationSchema } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }
type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authorization = await authorize(request)
  if (authorization) return authorization
  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection)
  const id = routeIdSchema.safeParse(await params)
  if (!id.success) return json(formatValidationError(id.error), 400)
  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    logger.error('Error al actualizar notificación admin', error)
    return json({ error: 'Error al actualizar notificación' }, 500)
  }
  const body = updateAdminNotificationSchema.safeParse(payload)
  if (!body.success) return json(formatValidationError(body.error), 400)
  return proxy(request, id.data.id, { method: 'PATCH', body: JSON.stringify(body.data) })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authorization = await authorize(request)
  if (authorization) return authorization
  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection)
  const id = routeIdSchema.safeParse(await params)
  if (!id.success) return json(formatValidationError(id.error), 400)
  return proxy(request, id.data.id, { method: 'DELETE' })
}

async function proxy(request: NextRequest, id: string, init: RequestInit) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return json({ error: 'Spring backend not configured' }, 503)
  try {
    const response = await fetch(`${backendUrl}/api/v1/admin/notifications/${id}`, {
      ...init,
      cache: 'no-store',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...getSpringBackendHeaders(), ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {}) }
    })
    return new NextResponse(await response.text(), { status: response.status, headers: { ...NO_STORE_HEADERS, 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' } })
  } catch (error) {
    logger.error('Spring backend unavailable for admin notification', error)
    return json({ error: 'Spring backend unavailable' }, 503)
  }
}

function json(body: unknown, status: number) { return NextResponse.json(body, { status, headers: NO_STORE_HEADERS }) }

async function authorize(request: NextRequest) {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return json({ error: 'No autorizado' }, 401)

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') return json({ error: 'No autorizado' }, 401)
  if (session.state === 'forbidden') return json({ error: 'No autorizado' }, 403)
  if (session.state === 'unavailable') return json({ error: 'Spring backend unavailable' }, 503)
  return null
}

function withNoStore(response: Response) {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
