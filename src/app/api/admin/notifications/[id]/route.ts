import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  formatValidationError,
  routeIdSchema,
  updateAdminNotificationSchema
} from '@/lib/apiValidation'
import { toAdminNotificationDto, type AdminNotificationDtoSource } from '@/lib/dto/adminNotification'
import { isMissingTableOrColumnError } from '@/lib/prismaError'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }

    const body = await request.json()
    const bodyValidation = updateAdminNotificationSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    let updated: AdminNotificationDtoSource
    try {
      updated = await prisma.adminNotification.update({
        where: { id: parsedParams.data.id },
        data: { isRead: bodyValidation.data.isRead }
      })
    } catch (error) {
      if (!isMissingTableOrColumnError(error)) throw error
      updated = await prisma.adminNotification.update({
        where: { id: parsedParams.data.id },
        data: { isRead: bodyValidation.data.isRead },
        select: {
          id: true,
          title: true,
          message: true,
          level: true,
          isRead: true,
          createdAt: true
        }
      })
    }

    return NextResponse.json(toAdminNotificationDto(updated))
  } catch (error) {
    logger.error('Error al actualizar notificación admin', error)
    return NextResponse.json({ error: 'Error al actualizar notificación' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }

    // Usamos deleteMany para evitar errores por registros inexistentes
    // y para tolerar mejor esquemas parcialmente desalineados.
    await prisma.adminNotification.deleteMany({
      where: { id: parsedParams.data.id }
    })

    return NextResponse.json({ message: 'Notificación eliminada' })
  } catch (error) {
    logger.error('Error al eliminar notificación admin', error)
    return NextResponse.json({ error: 'Error al eliminar notificación' }, { status: 500 })
  }
}
