import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { createAdminCandidateSchema, formatValidationError } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getAllowedBffRequestHeaders, relaySpringCookies } from '@/lib/server/adminBffBoundary'

export async function POST(request: NextRequest) {
  let springHeaders: Headers | undefined

  try {
    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const body = await request.json()
    const bodyValidation = createAdminCandidateSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    const { candidateName, email, phone, notes } = bodyValidation.data

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders(),
          ...getAllowedBffRequestHeaders(request),
          ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
        },
        body: JSON.stringify({ candidateName, email, phone, notes })
      })
      springHeaders = springResponse.headers
    } catch (error) {
      logger.error('Spring backend unreachable for candidate create', error)
      return NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      )
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return relaySpringCookies(NextResponse.json(errorJson, { status: springResponse.status }), springResponse.headers)
      } catch {
        logger.error(
          'Spring backend returned non-JSON candidate create error',
          new Error('Spring candidate create failed'),
          { category: 'spring_candidate_mutation_failure', status: springResponse.status }
        )
        return relaySpringCookies(NextResponse.json(
          { error: 'Error al registrar candidato manual' },
          { status: springResponse.status }
        ), springResponse.headers)
      }
    }

    const responseBody = await springResponse.json()

    return relaySpringCookies(NextResponse.json(responseBody, { status: springResponse.status }), springResponse.headers)
  } catch (error) {
    logger.error('Error al registrar candidato manual', error)
    return relaySpringCookies(NextResponse.json(
      { error: 'Error al registrar candidato manual' },
      { status: 500 }
    ), springHeaders)
  }
}
