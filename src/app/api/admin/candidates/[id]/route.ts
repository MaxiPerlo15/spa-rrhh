import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateAdminCandidateSchema } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getAllowedBffRequestHeaders, relaySpringCookies } from '@/lib/server/adminBffBoundary'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  let springHeaders: Headers | undefined

  try {
    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }

    const { id } = parsedParams.data
    const body = await request.json()
    const bodyValidation = updateAdminCandidateSchema.safeParse(body)
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

    const { candidateName, email, phone } = bodyValidation.data

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/candidates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders(),
          ...getAllowedBffRequestHeaders(request),
          ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
        },
        body: JSON.stringify({ candidateName, email, phone })
      })
      springHeaders = springResponse.headers
    } catch (error) {
      logger.error('Spring backend unreachable for candidate update', error)
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
          'Spring backend returned non-JSON candidate update error',
          new Error('Spring candidate update failed'),
          { category: 'spring_candidate_mutation_failure', status: springResponse.status }
        )
        return relaySpringCookies(NextResponse.json(
          { error: 'Error al actualizar candidato' },
          { status: springResponse.status }
        ), springResponse.headers)
      }
    }

    const responseBody = await springResponse.json()

    return relaySpringCookies(NextResponse.json(responseBody, { status: springResponse.status }), springResponse.headers)
  } catch (error) {
    logger.error('Error al actualizar candidato', error)
    return relaySpringCookies(NextResponse.json(
      { error: 'Error al actualizar candidato' },
      { status: 500 }
    ), springHeaders)
  }
}
