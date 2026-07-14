import { withAuth } from "next-auth/middleware"
import { NextFetchEvent, NextRequest, NextResponse } from "next/server"
import { applyCorsHeaders, isAllowedOrigin, isPublicCorsRequest } from "@/lib/cors"
import { getSpringSession } from "@/lib/springSession"

const isProduction = process.env.NODE_ENV === 'production'

const publicAdminPaths = new Set([
  "/admin/signin",
  "/admin/forgot-password",
  "/admin/reset-password",
])

function buildNonceCsp(nonce: string) {
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? '' : " 'unsafe-eval'"} https://challenges.cloudflare.com https://uploadthing.com https://*.uploadthing.com`,
    `connect-src 'self' ${isProduction ? '' : 'ws: http://localhost:* https://localhost:* '}https://*.ingest.sentry.io https://sentry.io https://challenges.cloudflare.com https://uploadthing.com https://*.uploadthing.com https://*.ufs.sh https://*.utfs.io`,
    "worker-src 'self' blob:",
    "media-src 'self' blob: https:",
    "frame-src https://challenges.cloudflare.com"
  ]

  if (isProduction) {
    cspDirectives.push('upgrade-insecure-requests')
  }

  return cspDirectives.join('; ')
}

function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/=+$/u, '')
}

function withNonceCspResponse(request: NextRequest) {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
  response.headers.set('Content-Security-Policy', buildNonceCsp(nonce))
  return response
}

function extractSessionCookie(request: NextRequest): string {
  const cookieHeader = request.headers.get('cookie') || ''
  const sessionMatch = cookieHeader.match(/SESSIONID=([^;]+)/)
  return sessionMatch ? `SESSIONID=${sessionMatch[1]}` : ''
}

const adminProxyWithNextAuth = withAuth(
  function authorizedAdminProxy(request) {
    return withNonceCspResponse(request)
  },
  {
    pages: {
      signIn: "/admin/signin",
    },
  }
)

async function adminProxyWithSpringSession(request: NextRequest) {
  const sessionCookie = extractSessionCookie(request)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/admin/signin', request.url))
  }

  const session = await getSpringSession(sessionCookie)
  if (session.state === 'anonymous') {
    return NextResponse.redirect(new URL('/admin/signin', request.url))
  }
  if (session.state === 'forbidden') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (session.state === 'unavailable') {
    return NextResponse.json({ error: 'spring_session_unavailable' }, { status: 503 })
  }

  return withNonceCspResponse(request)
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (publicAdminPaths.has(request.nextUrl.pathname)) {
    return withNonceCspResponse(request)
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const pathname = request.nextUrl.pathname
    const origin = request.headers.get("origin")
    const requestedHeaders = request.headers.get("access-control-request-headers")
    const isCrossOriginRequest = Boolean(origin && origin !== request.nextUrl.origin)

    if (isCrossOriginRequest && origin && !isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
    }

    if (isCrossOriginRequest && !isPublicCorsRequest(pathname, request.method)) {
      return NextResponse.json({ error: "Cross-origin access not allowed" }, { status: 403 })
    }

    if (request.method === "OPTIONS") {
      const preflightResponse = new NextResponse(null, { status: 204 })
      if (isCrossOriginRequest && origin) {
        applyCorsHeaders(preflightResponse.headers, origin, requestedHeaders)
      }
      return preflightResponse
    }

    const response = NextResponse.next()
    if (isCrossOriginRequest && origin) {
      applyCorsHeaders(response.headers, origin, requestedHeaders)
    }
    return response
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (process.env.SPRING_AUTH_ENABLED === 'true') {
      return adminProxyWithSpringSession(request)
    }
    return adminProxyWithNextAuth(request as never, event)
  }

  return withNonceCspResponse(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[^/]+$).*)"],
}
