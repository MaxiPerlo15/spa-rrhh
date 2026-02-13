import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
import { normalizeLocation } from '@/lib/utils'
import { formatValidationError, routeIdSchema, updateVacancySchema } from '@/lib/apiValidation'
import { toVacancyDto } from '@/lib/dto/vacancy'


interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/vacancies/[id] - Obtener una vacante específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const session = await auth()
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const vacancy = isAdmin
      ? await prisma.vacancy.findUnique({
          where: { id },
          include: {
            applications: {
              select: {
                id: true,
                candidateName: true,
                status: true,
                submittedAt: true
              }
            }
          }
        })
      : await prisma.vacancy.findUnique({
          where: { id }
        })

    if (!vacancy) {
      return NextResponse.json(
        { error: 'Vacante no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(toVacancyDto(vacancy))
  } catch (error) {
    logger.error('Error al obtener vacante', error)
    return NextResponse.json(
      { error: 'Error al obtener vacante' },
      { status: 500 }
    )
  }
}

// Función compartida para actualizar vacante
async function updateVacancy(request: NextRequest, params: Promise<{ id: string }>) {
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
        action: 'vacancy.update',
        resourceType: 'vacancy',
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
    const bodyValidation = updateVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const normalizedBody = { ...bodyValidation.data }

    if (normalizedBody.location) {
      normalizedBody.location = normalizeLocation(normalizedBody.location)
    }

    const previousVacancy = await prisma.vacancy.findUnique({
      where: { id },
      select: {
        status: true,
        title: true
      }
    })

    const vacancy = await prisma.vacancy.update({
      where: { id },
      data: normalizedBody
    })

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'vacancy.update',
      resourceType: 'vacancy',
      resourceId: vacancy.id,
      outcome: 'SUCCESS',
      metadata: {
        changedFields: Object.keys(normalizedBody),
        previousStatus: previousVacancy?.status,
        newStatus: vacancy.status,
        title: vacancy.title
      }
    })

    return NextResponse.json(toVacancyDto(vacancy))
  } catch (error) {
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'vacancy.update',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al actualizar vacante', error)
    return NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    )
  }
}

// PUT /api/vacancies/[id] - Actualizar vacante (admin)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return updateVacancy(request, params)
}

// PATCH /api/vacancies/[id] - Actualizar vacante parcialmente (admin)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  return updateVacancy(request, params)
}

// DELETE /api/vacancies/[id] - Eliminar vacante (admin)
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
        action: 'vacancy.delete',
        resourceType: 'vacancy',
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

    const existing = await prisma.vacancy.findUnique({
      where: { id },
      select: {
        title: true,
        status: true
      }
    })
    
    await prisma.vacancy.delete({
      where: { id }
    })

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'vacancy.delete',
      resourceType: 'vacancy',
      resourceId: id,
      outcome: 'SUCCESS',
      metadata: {
        title: existing?.title,
        previousStatus: existing?.status
      }
    })

    return NextResponse.json({ message: 'Vacante eliminada exitosamente' })
  } catch (error) {
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'vacancy.delete',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al eliminar vacante', error)
    return NextResponse.json(
      { error: 'Error al eliminar vacante' },
      { status: 500 }
    )
  }
}
