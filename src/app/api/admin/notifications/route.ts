import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  adminNotificationsListQuerySchema,
  createAdminNotificationSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { toAdminNotificationDto, type AdminNotificationDtoSource } from '@/lib/dto/adminNotification'
import { isMissingTableOrColumnError } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const queryValidation = adminNotificationsListQuerySchema.safeParse({
      view: request.nextUrl.searchParams.get('view') ?? undefined,
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined
    })

    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }

    const { view, page, limit } = queryValidation.data
    const where =
      view === 'all'
        ? {}
        : {
            isRead: view === 'read'
          }

    let items: AdminNotificationDtoSource[]
    const totalPromise = prisma.adminNotification.count({ where })
    try {
      items = await prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    } catch (error) {
      if (!isMissingTableOrColumnError(error)) throw error
      items = await prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
    const total = await totalPromise

    return NextResponse.json({
      items: items.map(toAdminNotificationDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (error) {
    logger.error('Error al listar notificaciones admin', error)
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const bodyValidation = createAdminNotificationSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    let created: AdminNotificationDtoSource
    try {
      created = await prisma.adminNotification.create({
        data: {
          title: bodyValidation.data.title,
          message: bodyValidation.data.message,
          level: bodyValidation.data.level,
          actionLabel: bodyValidation.data.action?.label,
          actionType: bodyValidation.data.action?.type,
          actionResourceId: bodyValidation.data.action?.resourceId
        }
      })
    } catch (error) {
      if (!isMissingTableOrColumnError(error)) throw error
      created = await prisma.adminNotification.create({
        data: {
          title: bodyValidation.data.title,
          message: bodyValidation.data.message,
          level: bodyValidation.data.level
        },
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

    return NextResponse.json(toAdminNotificationDto(created), { status: 201 })
  } catch (error) {
    logger.error('Error al crear notificación admin', error)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const view = request.nextUrl.searchParams.get('view')
    const where =
      view === 'read'
        ? { isRead: true }
        : view === 'all'
          ? {}
          : null

    if (!where) {
      return NextResponse.json({ error: 'Parámetro view inválido' }, { status: 400 })
    }

    const deleted = await prisma.adminNotification.deleteMany({ where })

    return NextResponse.json({ deletedCount: deleted.count })
  } catch (error) {
    logger.error('Error al eliminar notificaciones admin', error)
    return NextResponse.json({ error: 'Error al eliminar notificaciones' }, { status: 500 })
  }
}
