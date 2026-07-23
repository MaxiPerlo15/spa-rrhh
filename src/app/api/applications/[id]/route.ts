import { NextRequest, NextResponse } from 'next/server'
import type { ApplicationStatus } from '@/domain/application/ApplicationStatusMachine'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import {
  formatValidationError,
  routeIdSchema,
  updateApplicationStatusSchema
} from '@/lib/apiValidation'
import { toApplicationAdminDto } from '@/lib/dto/application'
import { getApplication, updateApplicationStatus, deleteApplication, SpringApplicationWriteError } from '@/lib/server/springApplicationGateway'
import { getBackendUrl } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AuthorizedSession = { cookie: string; setCookie?: string }

function relayCookie(response: NextResponse, setCookie?: string) {
  if (setCookie) response.headers.set('Set-Cookie', setCookie)
  return response
}

async function getAuthorizedSessionCookie(request: NextRequest): Promise<AuthorizedSession | NextResponse> {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') {
    return relayCookie(NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session.setCookie)
  }
  if (session.state === 'forbidden') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (session.state === 'unavailable') return NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 })
  return { cookie: session.setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`, setCookie: session.setCookie }
}

// GET /api/applications/[id] — Spring-delegated detail
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined

  try {
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return relayCookie(originRejection, authorizedSetCookie)
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return relayCookie(NextResponse.json(formatValidationError(parsedParams.error), { status: 400 }), authorizedSetCookie)
    }
    const { id } = parsedParams.data

    if (!getBackendUrl()) {
      return relayCookie(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorizedSetCookie)
    }

    const application = await getApplication(id, sessionCookie.cookie)
    if (!application) {
      return relayCookie(NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      ), authorizedSetCookie)
    }

    return relayCookie(NextResponse.json(
      toApplicationAdminDto({
        id: application.id,
        candidateId: application.candidateId,
        candidateName: application.candidateName,
        email: application.email,
        phone: application.phone,
        resumeUrl: application.resumeUrl,
        resumeFileName: application.resumeFileName,
        coverLetter: application.coverLetter,
        status: application.status as ApplicationStatus,
        submittedAt: application.submittedAt,
        vacancy: application.vacancy
          ? { id: application.vacancy.id, title: application.vacancy.title, location: application.vacancy.location }
          : null
      })), authorizedSetCookie)
  } catch (error) {
    logger.error('Error al obtener postulación', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al obtener postulación' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}

// PATCH /api/applications/[id] — Spring-delegated status update
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined

  try {
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return relayCookie(originRejection, authorizedSetCookie)
    }

    if (!getBackendUrl()) {
      return relayCookie(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorizedSetCookie)
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return relayCookie(NextResponse.json(formatValidationError(parsedParams.error), { status: 400 }), authorizedSetCookie)
    }
    const { id } = parsedParams.data

    const body = await request.json()
    const bodyValidation = updateApplicationStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return relayCookie(NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 }), authorizedSetCookie)
    }
    const { status } = bodyValidation.data

    let updated
    try {
      updated = await updateApplicationStatus(id, status, sessionCookie.cookie)
    } catch (error) {
      if (error instanceof SpringApplicationWriteError) {
        if (error.status === 404) {
          return relayCookie(NextResponse.json(
            { error: 'Postulación no encontrada' },
            { status: 404 }
          ), authorizedSetCookie)
        }
        return relayCookie(NextResponse.json(
          { error: error.message },
          { status: error.status }
        ), authorizedSetCookie)
      }
      throw error
    }

    return relayCookie(NextResponse.json(
      toApplicationAdminDto({
        id: updated.id,
        candidateId: updated.candidateId,
        candidateName: updated.candidateName,
        email: updated.email,
        phone: updated.phone,
        resumeUrl: updated.resumeUrl,
        resumeFileName: updated.resumeFileName,
        coverLetter: updated.coverLetter,
        status: updated.status as ApplicationStatus,
        submittedAt: updated.submittedAt,
        vacancy: updated.vacancy
          ? { id: updated.vacancy.id, title: updated.vacancy.title, location: updated.vacancy.location }
          : null
      })), authorizedSetCookie)
  } catch (error) {
    logger.error('Error al actualizar postulación', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al actualizar postulación' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}

// DELETE /api/applications/[id] — Spring-delegated hard delete
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined

  try {
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return relayCookie(originRejection, authorizedSetCookie)
    }

    if (!getBackendUrl()) {
      return relayCookie(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorizedSetCookie)
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return relayCookie(NextResponse.json(formatValidationError(parsedParams.error), { status: 400 }), authorizedSetCookie)
    }
    const { id } = parsedParams.data

    try {
      await deleteApplication(id, sessionCookie.cookie)
    } catch (error) {
      if (error instanceof SpringApplicationWriteError) {
        if (error.status === 404) {
          return relayCookie(NextResponse.json(
            { error: 'Postulación no encontrada' },
            { status: 404 }
          ), authorizedSetCookie)
        }
        return relayCookie(NextResponse.json(
          { error: error.message },
          { status: error.status }
        ), authorizedSetCookie)
      }
      throw error
    }

    return relayCookie(NextResponse.json({ success: true }), authorizedSetCookie)
  } catch (error) {
    logger.error('Error al eliminar postulación', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al eliminar postulación' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}
