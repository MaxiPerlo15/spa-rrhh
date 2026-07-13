import { NextRequest, NextResponse } from 'next/server'
import type { ApplicationStatus } from '@/domain/application/ApplicationStatusMachine'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import {
  formatValidationError,
  routeIdSchema,
  updateApplicationStatusSchema
} from '@/lib/apiValidation'
import { toApplicationAdminDto } from '@/lib/dto/application'
import { getApplication, updateApplicationStatus, deleteApplication, SpringApplicationWriteError } from '@/lib/server/springApplicationGateway'
import { getBackendUrl } from '@/lib/server/springBackend'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/applications/[id] — Spring-delegated detail
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      await auditAdminAction({
        request,
        actor: {
          id: session?.user?.id,
          email: session?.user?.email
        },
        action: 'application.view',
        resourceType: 'application',
        outcome: 'DENIED'
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
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

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    const application = await getApplication(id)
    if (!application) {
      return NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      )
    }

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'application.view',
      resourceType: 'application',
      resourceId: id,
      outcome: 'SUCCESS',
      metadata: {
        backend: 'spring'
      }
    })

    return NextResponse.json(
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
      })
    )
  } catch (error) {
    logger.error('Error al obtener postulación', error)
    return NextResponse.json(
      { error: 'Error al obtener postulación' },
      { status: 500 }
    )
  }
}

// PATCH /api/applications/[id] — Spring-delegated status update
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
        action: 'application.update_status',
        resourceType: 'application',
        outcome: 'DENIED'
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    resourceId = id

    const body = await request.json()
    const bodyValidation = updateApplicationStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { status } = bodyValidation.data

    let updated
    try {
      updated = await updateApplicationStatus(id, status)
    } catch (error) {
      if (error instanceof SpringApplicationWriteError) {
        if (error.status === 404) {
          return NextResponse.json(
            { error: 'Postulación no encontrada' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        )
      }
      throw error
    }

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'application.update_status',
      resourceType: 'application',
      resourceId: id,
      outcome: 'SUCCESS',
      metadata: {
        newStatus: status,
        backend: 'spring'
      }
    })

    return NextResponse.json(
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
      })
    )
  } catch (error) {
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'application.update_status',
      resourceType: 'application',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al actualizar postulación', error)
    return NextResponse.json(
      { error: 'Error al actualizar postulación' },
      { status: 500 }
    )
  }
}

// DELETE /api/applications/[id] — Spring-delegated hard delete
export async function DELETE(
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
        action: 'application.delete',
        resourceType: 'application',
        outcome: 'DENIED'
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    resourceId = id

    try {
      await deleteApplication(id)
    } catch (error) {
      if (error instanceof SpringApplicationWriteError) {
        if (error.status === 404) {
          return NextResponse.json(
            { error: 'Postulación no encontrada' },
            { status: 404 }
          )
        }
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        )
      }
      throw error
    }

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'application.delete',
      resourceType: 'application',
      resourceId: id,
      outcome: 'SUCCESS',
      metadata: {
        backend: 'spring'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'application.delete',
      resourceType: 'application',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al eliminar postulación', error)
    return NextResponse.json(
      { error: 'Error al eliminar postulación' },
      { status: 500 }
    )
  }
}
