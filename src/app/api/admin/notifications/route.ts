import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  adminNotificationsListQuerySchema,
  createAdminNotificationSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { toAdminNotificationDto } from '@/lib/dto/adminNotification'

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

    const [items, total] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.adminNotification.count({ where })
    ])

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

    const created = await prisma.adminNotification.create({
      data: {
        title: bodyValidation.data.title,
        message: bodyValidation.data.message,
        level: bodyValidation.data.level,
        actionLabel: bodyValidation.data.action?.label,
        actionType: bodyValidation.data.action?.type,
        actionResourceId: bodyValidation.data.action?.resourceId
      }
    })

    return NextResponse.json(toAdminNotificationDto(created), { status: 201 })
  } catch (error) {
    logger.error('Error al crear notificación admin', error)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}
