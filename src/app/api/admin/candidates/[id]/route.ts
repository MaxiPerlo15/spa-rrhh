import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
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
  let session = null as Awaited<ReturnType<typeof auth>>
  let resourceId: string | undefined

  try {
    session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      await auditAdminAction({
        request,
        actor: {
          id: session?.user?.id,
          email: session?.user?.email
        },
        action: 'candidate.update',
        resourceType: 'candidate',
        outcome: 'DENIED'
      })
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
    resourceId = id

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

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'candidate.update',
      resourceType: 'candidate',
      resourceId: id,
      outcome: 'SUCCESS',
      metadata: {
        candidateName,
        email,
        phone,
        updatedApplications: responseBody.applications?.length ?? 0
      }
    })

    return NextResponse.json(responseBody)
  } catch (error) {
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'candidate.update',
      resourceType: 'candidate',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al actualizar candidato', error)
    return NextResponse.json(
      { error: 'Error al actualizar candidato' },
      { status: 500 }
    )
  }
}
