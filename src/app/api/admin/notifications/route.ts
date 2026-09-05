import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { adminNotificationsListQuerySchema, createAdminNotificationSchema, formatValidationError } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization) return authorization
  const validation = adminNotificationsListQuerySchema.safeParse({ view: request.nextUrl.searchParams.get('view') ?? undefined, page: request.nextUrl.searchParams.get('page') ?? undefined, limit: request.nextUrl.searchParams.get('limit') ?? undefined })
  if (!validation.success) return json(formatValidationError(validation.error), 400)
  const { view, page, limit } = validation.data
  return proxy(request, `/api/v1/admin/notifications?view=${view}&page=${page}&limit=${limit}`)
}

export async function POST(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization) return authorization
  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection)
  let body: unknown
  try {
    body = await request.json()
  } catch (error) {
    logger.error('Error al crear notificación admin', error)
    return json({ error: 'Error al crear notificación' }, 500)
  }
  const validation = createAdminNotificationSchema.safeParse(body)
  if (!validation.success) return json(formatValidationError(validation.error), 400)
  return proxy(request, '/api/v1/admin/notifications', { method: 'POST', body: JSON.stringify(validation.data) })
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization) return authorization
  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection)
  const view = request.nextUrl.searchParams.get('view')
  if (view !== 'all' && view !== 'read') return json({ error: 'Parámetro view inválido' }, 400)
  return proxy(request, `/api/v1/admin/notifications?view=${view}`, { method: 'DELETE' })
}

async function proxy(request: NextRequest, path: string, init?: RequestInit) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return json({ error: 'Spring backend not configured' }, 503)
  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...getSpringBackendHeaders(), ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {}) }
    })
    return new NextResponse(await response.text(), { status: response.status, headers: { ...NO_STORE_HEADERS, 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' } })
  } catch (error) {
    logger.error('Spring backend unavailable for admin notifications', error)
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
