import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { ExportApplicationsUseCase } from '@/application/exports/ExportApplicationsUseCase'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import {
  authorizeDashboardRead,
  relaySpringCookies,
  type SpringCookieSource
} from '@/lib/server/adminBffBoundary'

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
  let responseCookies: SpringCookieSource

  try {
    const searchParams = request.nextUrl.searchParams
    const queryValidation = exportApplicationsQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      vacancyId: searchParams.get('vacancyId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortDirection: searchParams.get('sortDirection') ?? undefined
    })

    if (!queryValidation.success) {
      return json(
        {
          error: 'Parámetros inválidos',
          details: queryValidation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        400
      )
    }

    const authorization = await authorizeDashboardRead(request)
    responseCookies = authorization.responseCookies
    if (authorization.state !== 'authorized') {
      return json(
        { error: authorization.state === 'unavailable' ? 'Spring backend unavailable' : 'No autorizado' },
        authorization.status,
        responseCookies
      )
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return json({ error: 'Spring backend not configured' }, 503, responseCookies)
    }

    const { status, vacancyId, search, sortBy, sortDirection } = queryValidation.data
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (vacancyId) params.set('vacancyId', vacancyId)
    if (search) params.set('search', search)
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDirection) params.set('sortDirection', sortDirection)

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/applications?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          ...getSpringBackendHeaders(),
          Cookie: authorization.cookie
        }
      })
    } catch (error) {
      logger.error('Spring backend unreachable for application export', error)
      return json({ error: 'Spring backend unavailable' }, 503, responseCookies)
    }

    if (!springResponse.ok) {
      const errorResponse = await springErrorResponse(springResponse)
      return relaySpringCookies(
        relaySpringCookies(errorResponse, responseCookies),
        springResponse.headers
      )
    }

    const applications = await springResponse.json() as SpringApplicationListResponse[]

    const exportFile = new ExportApplicationsUseCase().execute(
      applications.map((application) => ({
        candidateName: application.candidateName,
        email: application.email,
        phone: application.phone,
        vacancyTitle: application.vacancy?.title ?? 'Espontánea',
        submittedAt: new Date(application.submittedAt)
      }))
    )

    return relaySpringCookies(
      relaySpringCookies(new NextResponse(exportFile.content, {
        status: 200,
        headers: {
          'Content-Type': exportFile.mimeType,
          'Content-Disposition': `attachment; filename="${exportFile.fileName}"`
        }
      }), responseCookies),
      springResponse.headers
    )
  } catch (error) {
    logger.error('Error al exportar postulaciones', error)
    return relaySpringCookies(
      NextResponse.json({ error: 'Error al exportar postulaciones' }, { status: 500 }),
      responseCookies
    )
  }
}

type SpringApplicationListResponse = {
  candidateName: string
  email: string
  phone: string
  submittedAt: string
  vacancy: { title: string } | null
}

async function springErrorResponse(response: Response) {
  const errorBody = await response.text()
  try {
    return NextResponse.json(JSON.parse(errorBody), { status: response.status })
  } catch {
    return NextResponse.json(
      { error: errorBody || 'Error al exportar postulaciones' },
      { status: response.status }
    )
  }
}

function json(body: unknown, status: 400 | 401 | 403 | 503, cookies?: SpringCookieSource) {
  return relaySpringCookies(NextResponse.json(body, { status }), cookies)
}
