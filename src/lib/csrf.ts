import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin } from '@/lib/cors'

function resolveRequestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')?.trim()
  if (origin) return origin

  const referer = request.headers.get('referer')?.trim()
  if (!referer) return null

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export function rejectIfUntrustedOrigin(request: NextRequest) {
  const requestOrigin = resolveRequestOrigin(request)

  if (!requestOrigin) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
    }
    return null
  }

  if (!isAllowedOrigin(requestOrigin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  return null
}
