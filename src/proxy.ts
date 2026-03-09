import { withAuth } from "next-auth/middleware"
import { NextFetchEvent, NextRequest, NextResponse } from "next/server"
import { applyCorsHeaders, isAllowedOrigin } from "@/lib/cors"

const adminProxy = withAuth({
  pages: {
    signIn: "/admin/signin",
  },
})

const publicAdminPaths = new Set([
  "/admin/signin",
  "/admin/forgot-password",
  "/admin/reset-password",
])

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (publicAdminPaths.has(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin")
    const requestedHeaders = request.headers.get("access-control-request-headers")

    if (origin && !isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })
    }

    if (request.method === "OPTIONS") {
      const preflightResponse = new NextResponse(null, { status: 204 })
      if (origin) {
        applyCorsHeaders(preflightResponse.headers, origin, requestedHeaders)
      }
      return preflightResponse
    }

    const response = NextResponse.next()
    if (origin) {
      applyCorsHeaders(response.headers, origin, requestedHeaders)
    }
    return response
  }

  return adminProxy(request as never, event)
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
