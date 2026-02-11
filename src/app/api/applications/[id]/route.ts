import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
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
  try {
    // Verificar autenticación
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

    const body = await request.json()
    const bodyValidation = updateApplicationStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { status } = bodyValidation.data

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

    return NextResponse.json(toApplicationAdminDto(application))
  } catch (error) {
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
  try {
    // Verificar autenticación
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

    await prisma.application.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error al eliminar postulación', error)
    return NextResponse.json(
      { error: 'Error al eliminar postulación' },
      { status: 500 }
    )
  }
}
