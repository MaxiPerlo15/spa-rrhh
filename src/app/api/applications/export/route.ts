import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveApplicationCandidate } from '@/lib/candidateRecord'
import { ExportApplicationsUseCase } from '@/application/exports/ExportApplicationsUseCase'

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
              { candidate: { is: { name: { contains: search, mode: 'insensitive' as const } } } },
              { candidate: { is: { lastName: { contains: search, mode: 'insensitive' as const } } } },
              { candidate: { is: { email: { contains: search, mode: 'insensitive' as const } } } }
            ]
          }
        : {})
    }

    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
      sortBy === 'submittedAt'
        ? [{ submittedAt: sortDirection }]
        : sortBy === 'candidateName'
          ? [{ candidate: { name: sortDirection } }, { submittedAt: 'desc' }]
          : [{ status: sortDirection }, { submittedAt: 'desc' }]

    const applications = await prisma.application.findMany({
      where,
      select: {
        candidateId: true,
        submittedAt: true,
        candidate: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            phone: true,
            resumeUrl: true,
            resumeFileName: true,
            resumeKey: true
          }
        }
      },
      orderBy
    })

    const exportFile = new ExportApplicationsUseCase().execute(
      applications.map((application) => ({
        ...resolveApplicationCandidate(application),
        vacancyTitle: 'Espontánea',
        submittedAt: application.submittedAt
      }))
    )

    return new NextResponse(exportFile.content, {
      status: 200,
      headers: {
        'Content-Type': exportFile.mimeType,
        'Content-Disposition': `attachment; filename="${exportFile.fileName}"`
      }
    })
  } catch (error) {
    logger.error('Error al exportar postulaciones', error)
    return NextResponse.json({ error: 'Error al exportar postulaciones' }, { status: 500 })
  }
}
