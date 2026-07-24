import { NextRequest, NextResponse } from 'next/server'
import { formatValidationError, updateAdminSettingsSchema } from '@/lib/apiValidation'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization instanceof Response) return authorization
  return proxy(request, '/api/v1/admin/settings', undefined, authorization.setCookie)
}

export async function PATCH(request: NextRequest) {
  const authorization = await authorize(request)
  if (authorization instanceof Response) return authorization
  const originRejection = rejectIfUntrustedOrigin(request)
  if (originRejection) return withNoStore(originRejection, authorization.setCookie)
  try {
    const validation = updateAdminSettingsSchema.safeParse(await request.json())
    if (!validation.success) return json(formatValidationError(validation.error), 400, authorization.setCookie)
    return proxy(request, '/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify(validation.data) }, authorization.setCookie)
  } catch { return json({ error: 'Malformed request body' }, 400, authorization.setCookie) }
}

async function proxy(request: NextRequest, path: string, init?: RequestInit, setCookie?: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) return json({ error: 'Spring backend not configured' }, 503, setCookie)
  try {
    const cookie = setCookie?.split(';', 1)[0] ?? request.headers.get('cookie')
    const response = await fetch(`${backendUrl}${path}`, { ...init, cache: 'no-store', headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...getSpringBackendHeaders(), ...(cookie ? { Cookie: cookie } : {}) } })
    return new NextResponse(await response.text(), { status: response.status, headers: { ...NO_STORE_HEADERS, 'Content-Type': response.headers.get('Content-Type') ?? 'application/json', ...(setCookie ? { 'Set-Cookie': setCookie } : {}) } })
  } catch { return json({ error: 'Spring backend unavailable' }, 503, setCookie) }
}

function json(body: unknown, status: number, setCookie?: string) { return NextResponse.json(body, { status, headers: { ...NO_STORE_HEADERS, ...(setCookie ? { 'Set-Cookie': setCookie } : {}) } }) }
function withNoStore(response: Response, setCookie?: string) { response.headers.set('Cache-Control', 'no-store'); if (setCookie) response.headers.set('Set-Cookie', setCookie); return response }
async function authorize(request: NextRequest) {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return json({ error: 'No autorizado' }, 401)
  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') return json({ error: 'No autorizado' }, 401, session.setCookie)
  if (session.state === 'forbidden') return json({ error: 'No autorizado' }, 403)
  if (session.state === 'unavailable') return json({ error: 'Spring backend unavailable' }, 503)
  return { setCookie: session.setCookie }
}
