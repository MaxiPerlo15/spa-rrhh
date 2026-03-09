import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
import {
  formatValidationError,
  routeIdSchema,
  updateApplicationStatusSchema
} from '@/lib/apiValidation'
import { toApplicationAdminDto } from '@/lib/dto/application'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/applications/[id] - Obtener una postulación específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        candidateName: true,
        email: true,
        phone: true,
        resumeUrl: true,
        resumeFileName: true,
        coverLetter: true,
        status: true,
        submittedAt: true,
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(toApplicationAdminDto(application))
  } catch (error) {
    logger.error('Error al obtener postulación', error)
    return NextResponse.json(
      { error: 'Error al obtener postulación' },
      { status: 500 }
    )
  }
}

// PATCH /api/applications/[id] - Actualizar estado de postulación (admin)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  let session = null as Awaited<ReturnType<typeof auth>>
  let resourceId: string | undefined
  try {
    // Verificar autenticación
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
    const previous = await prisma.application.findUnique({
      where: { id },
      select: {
        status: true,
        candidateName: true
      }
    })

    const application = await prisma.application.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        candidateName: true,
        email: true,
        phone: true,
        resumeUrl: true,
        resumeFileName: true,
        coverLetter: true,
        status: true,
        submittedAt: true,
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true
          }
        }
      }
    })

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
        previousStatus: previous?.status,
        newStatus: status,
        candidateName: previous?.candidateName
      }
    })

    return NextResponse.json(toApplicationAdminDto(application))
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

// DELETE /api/applications/[id] - Eliminar postulación (admin)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  let session = null as Awaited<ReturnType<typeof auth>>
  let resourceId: string | undefined
  try {
    // Verificar autenticación
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

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    resourceId = id

    const existing = await prisma.application.findUnique({
      where: { id },
      select: {
        candidateName: true,
        status: true,
        email: true
      }
    })

    await prisma.application.delete({
      where: { id }
    })

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
        candidateName: existing?.candidateName,
        previousStatus: existing?.status,
        candidateEmail: existing?.email
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
