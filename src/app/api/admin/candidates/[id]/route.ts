import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateAdminCandidateSchema } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
          ...getSpringBackendHeaders()
        },
        body: JSON.stringify({ candidateName, email, phone })
      })
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
        return NextResponse.json(errorJson, { status: springResponse.status })
      } catch {
        const errorBody = await springResponse.text()
        return NextResponse.json(
          { error: errorBody || 'Error al actualizar candidato' },
          { status: springResponse.status }
        )
      }
    }

    const responseBody = await springResponse.json()

    return NextResponse.json(responseBody)
  } catch (error) {
    logger.error('Error al actualizar candidato', error)
    return NextResponse.json(
      { error: 'Error al actualizar candidato' },
      { status: 500 }
    )
  }
}
