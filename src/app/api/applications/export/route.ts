import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { buildApplicationsCsv } from '@/lib/csv/applicationsExport'

const exportApplicationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'INTERVIEWED', 'ACCEPTED', 'REJECTED']).optional(),
  vacancyId: z.string().cuid('vacancyId inválido').optional(),
  search: z
    .string()
    .trim()
    .max(120, 'Búsqueda demasiado larga')
    .optional()
    .transform((value) => value || undefined),
  sortBy: z.enum(['submittedAt', 'candidateName', 'status']).optional().default('submittedAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryValidation = exportApplicationsQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      vacancyId: searchParams.get('vacancyId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortDirection: searchParams.get('sortDirection') ?? undefined
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: queryValidation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { status, vacancyId, search, sortBy, sortDirection } = queryValidation.data
    const where = {
      ...(status ? { status } : {}),
      ...(vacancyId ? { vacancyId } : {}),
      ...(search
        ? {
            OR: [
              { candidateName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { vacancy: { is: { title: { contains: search, mode: 'insensitive' as const } } } }
            ]
          }
        : {})
    }

    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
      sortBy === 'submittedAt'
        ? [{ submittedAt: sortDirection }]
        : [{ [sortBy]: sortDirection } as Prisma.ApplicationOrderByWithRelationInput, { submittedAt: 'desc' }]

    const applications = await prisma.application.findMany({
      where,
      select: {
        candidateName: true,
        email: true,
        phone: true,
        submittedAt: true,
        vacancy: {
          select: {
            title: true
          }
        }
      },
      orderBy
    })

    const csv = buildApplicationsCsv(
      applications.map((application) => ({
        candidateName: application.candidateName,
        email: application.email,
        phone: application.phone,
        vacancyTitle: application.vacancy?.title ?? 'Espontánea',
        submittedAt: application.submittedAt
      }))
    )
    const fileDate = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="postulaciones-${fileDate}.csv"`
      }
    })
  } catch (error) {
    logger.error('Error al exportar postulaciones CSV', error)
    return NextResponse.json({ error: 'Error al exportar postulaciones' }, { status: 500 })
  }
}
