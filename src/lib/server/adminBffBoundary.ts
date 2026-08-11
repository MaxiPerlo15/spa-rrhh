import { isIP } from 'node:net'

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
