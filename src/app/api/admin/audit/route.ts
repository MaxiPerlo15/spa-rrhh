import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { adminAuditListQuerySchema, formatValidationError } from '@/lib/apiValidation'
import { canUseSchemaDriftFallback } from '@/lib/prismaError'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const queryValidation = adminAuditListQuerySchema.safeParse({
      actorEmail: request.nextUrl.searchParams.get('actorEmail') ?? undefined,
      action: request.nextUrl.searchParams.get('action') ?? undefined,
      resourceType: request.nextUrl.searchParams.get('resourceType') ?? undefined,
      dateFrom: request.nextUrl.searchParams.get('dateFrom') ?? undefined,
      dateTo: request.nextUrl.searchParams.get('dateTo') ?? undefined,
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined
    })

    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }

    const { actorEmail, action, resourceType, dateFrom, dateTo, page, limit } = queryValidation.data
    const normalizedDateFrom = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null
    const normalizedDateTo = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null

    const where: Prisma.AdminAuditLogWhereInput = {
      ...(actorEmail ? { actorEmail } : {}),
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...((normalizedDateFrom || normalizedDateTo)
        ? {
            createdAt: {
              ...(normalizedDateFrom ? { gte: normalizedDateFrom } : {}),
              ...(normalizedDateTo ? { lte: normalizedDateTo } : {})
            }
          }
        : {})
    }

    try {
      const [items, total, actions, resourceTypes, actorEmails] = await prisma.$transaction([
        prisma.adminAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.adminAuditLog.count({ where }),
        prisma.adminAuditLog.findMany({
          distinct: ['action'],
          select: { action: true },
          orderBy: { action: 'asc' }
        }),
        prisma.adminAuditLog.findMany({
          distinct: ['resourceType'],
          select: { resourceType: true },
          orderBy: { resourceType: 'asc' }
        }),
        prisma.adminAuditLog.findMany({
          where: { actorEmail: { not: null } },
          distinct: ['actorEmail'],
          select: { actorEmail: true },
          orderBy: { actorEmail: 'asc' }
        })
      ])

      return NextResponse.json({
        items: items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString()
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        },
        filters: {
          actions: actions.map((item) => item.action),
          resourceTypes: resourceTypes.map((item) => item.resourceType),
          actorEmails: actorEmails.map((item) => item.actorEmail).filter((value): value is string => Boolean(value))
        }
      })
    } catch (error) {
      if (!canUseSchemaDriftFallback(error)) throw error
      logger.warn('Fallback temporal de auditoría admin por schema drift', {
        route: 'GET /api/admin/audit'
      })

      return NextResponse.json({
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1
        },
        filters: {
          actions: [],
          resourceTypes: [],
          actorEmails: []
        }
      })
    }
  } catch (error) {
    logger.error('Error al obtener timeline de auditoría admin', error)
    return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 })
  }
}
