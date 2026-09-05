import { isIP } from 'node:net'
import { auth } from '@/lib/auth'
import { getSpringSession } from '@/lib/springSession'
import { isSpringAuthEnabled } from './springBackend'

export function getAllowedBffRequestHeaders(request: Pick<Request, 'headers'>): Record<string, string> {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = request.headers.get('user-agent')?.trim()

  return {
    ...(forwardedFor && isIP(forwardedFor)
      ? { 'X-Forwarded-For': forwardedFor }
      : {}),
    ...(userAgent && userAgent.length <= 512 && !/[\r\n]/.test(userAgent)
      ? { 'User-Agent': userAgent }
      : {})
  }
}

type SpringCookieHeaders = Pick<Headers, 'get'> & {
  getSetCookie?: () => string[]
}

export type SpringCookieSource = string | readonly string[] | SpringCookieHeaders | undefined

function isCookieList(source: SpringCookieSource): source is readonly string[] {
  return Array.isArray(source)
}

function getSpringSetCookies(source: SpringCookieSource): readonly string[] {
  if (!source) return []
  if (typeof source === 'string') return [source]
  if (isCookieList(source)) return source
  const cookies = source.getSetCookie?.()
  if (cookies) return cookies

  const cookie = source.get('set-cookie')
  return cookie ? [cookie] : []
}

export function relaySpringCookies(response: Response, source: SpringCookieSource): Response {
  for (const cookie of getSpringSetCookies(source)) response.headers.append('Set-Cookie', cookie)
  return response
}

type AuthorizedDashboardRead = {
  state: 'authorized'
  cookie: string
  responseCookies?: SpringCookieSource
}

type DeniedDashboardRead = {
  state: 'anonymous' | 'forbidden' | 'unavailable'
  status: 401 | 403 | 503
  responseCookies?: SpringCookieSource
}

export type DashboardReadAuthorization = AuthorizedDashboardRead | DeniedDashboardRead

function replaceSessionCookie(cookie: string, setCookie?: string): string {
  const session = setCookie?.match(/(?:^|,\s*)SESSIONID=([^;]+)/)?.[1]
  if (!session) return cookie

  const cookies = cookie.split(';').map(part => part.trim()).filter(Boolean)
  const withoutSession = cookies.filter(part => !part.startsWith('SESSIONID='))
  return [`SESSIONID=${session}`, ...withoutSession].join('; ')
}

export async function authorizeDashboardRead(
  request: Pick<Request, 'headers'>
): Promise<DashboardReadAuthorization> {
  const cookie = request.headers.get('cookie') ?? ''

  if (isSpringAuthEnabled()) {
    const session = await getSpringSession(cookie)
    const responseCookies = 'setCookie' in session ? session.setCookie : undefined
    if (session.state === 'authorized') {
      return { state: 'authorized', cookie: replaceSessionCookie(cookie, session.setCookie), responseCookies }
    }
    return {
      state: session.state,
      status: session.state === 'anonymous' ? 401 : session.state === 'forbidden' ? 403 : 503,
      responseCookies
    }
  }

  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') return { state: 'anonymous', status: 401 }
  return { state: 'authorized', cookie }
}
