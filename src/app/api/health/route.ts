import { NextResponse } from 'next/server'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const backendUrl = getBackendUrl()
    if (!backendUrl) throw new Error('BACKEND_URL is required for health checks')

    const response = await fetch(`${backendUrl}/api/v1/health`, {
      cache: 'no-store',
      headers: getSpringBackendHeaders()
    })

    if (response.ok) return readyResponse()
  } catch {
    // The browser contract intentionally hides Spring transport details.
  }

  return unavailableResponse()
}

function readyResponse() {
  return NextResponse.json(
    { status: 'ok', database: 'ready' },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

function unavailableResponse() {
  return NextResponse.json(
    { status: 'error', database: 'unavailable' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
