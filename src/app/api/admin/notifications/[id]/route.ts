import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import {
  formatValidationError,
  routeIdSchema,
  updateAdminNotificationSchema
} from '@/lib/apiValidation'
import { toAdminNotificationDto, type AdminNotificationDtoSource } from '@/lib/dto/adminNotification'
import { canUseSchemaDriftFallback, isPrismaRecordNotFoundError } from '@/lib/prismaError'

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

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
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
      if (isPrismaRecordNotFoundError(error)) {
        return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 })
      }
      if (!canUseSchemaDriftFallback(error)) throw error
      logger.warn('Fallback temporal de actualización de notificaciones por schema drift', {
        route: 'PATCH /api/admin/notifications/[id]',
        notificationId: parsedParams.data.id
      })
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

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }

    try {
      await prisma.adminNotification.delete({
        where: { id: parsedParams.data.id }
      })
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ message: 'Notificación eliminada' })
  } catch (error) {
    logger.error('Error al eliminar notificación admin', error)
    return NextResponse.json({ error: 'Error al eliminar notificación' }, { status: 500 })
  }
}
