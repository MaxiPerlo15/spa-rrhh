import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import {
  createVacancySchema,
  formatValidationError,
  vacanciesListQuerySchema
} from '@/lib/apiValidation'
import { revalidatePublicVacanciesCache } from '@/lib/server/publicVacancies'
import {
  getBackendUrl,
  getSpringBackendHeaders
} from '@/lib/server/springBackend'
import {
  type SpringVacancyResponse,
  mapSpringToDto,
  buildCreatePayload,
  parseSpringError,
  getUnsupportedSpringVacancyFields,
  rejectUnsupportedSpringVacancyFields,
  SpringVacancyWriteError
} from '@/lib/server/springVacancyGateway'

async function createVacancyInSpring(data: ReturnType<typeof buildCreatePayload>) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy creation')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getSpringBackendHeaders()
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 400 || response.status === 404 || response.status === 409) {
      throw new SpringVacancyWriteError(
        response.status,
        parseSpringError(errorBody) || 'No se pudo crear la vacante por una regla de negocio'
      )
    }
    throw new Error(`Spring backend rejected vacancy creation (${response.status}): ${errorBody}`)
  }

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function listVacanciesInSpring(all: boolean) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy listing')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies?all=${all}`, {
    method: 'GET',
    headers: getSpringBackendHeaders()
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Spring backend rejected vacancy list (${response.status}): ${errorBody}`)
  }

  const vacancies = await response.json() as SpringVacancyResponse[]
  return vacancies.map(mapSpringToDto)
}

// GET /api/vacancies - Listar vacantes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryValidation = vacanciesListQuerySchema.safeParse({
      all: searchParams.get('all')?.toLowerCase()
    })
    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }
    const { all } = queryValidation.data

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Vacancy backend not configured' },
        { status: 503 }
      )
    }

    // Solo admins pueden pedir todas las vacantes
    if (all) {
      const session = await auth()
      if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        )
      }
    }

    const springVacancies = await listVacanciesInSpring(all)
    return NextResponse.json(springVacancies)
  } catch (error) {
    logger.error('Error al obtener vacantes', error)
    return NextResponse.json(
      { error: 'Error al obtener vacantes' },
      { status: 500 }
    )
  }
}

// POST /api/vacancies - Crear nueva vacante (admin)
export async function POST(request: NextRequest) {
  let session = null as Awaited<ReturnType<typeof auth>>
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
        action: 'vacancy.create',
        resourceType: 'vacancy',
        outcome: 'DENIED'
      })
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Vacancy backend not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const bodyValidation = createVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { title, description, location, workday, modality, salary, requirements, benefits } = bodyValidation.data

    const unsupportedFields = getUnsupportedSpringVacancyFields({ salary, benefits })
    if (unsupportedFields.length > 0) {
      return rejectUnsupportedSpringVacancyFields(unsupportedFields)
    }

    const springVacancy = await createVacancyInSpring(buildCreatePayload({
      title,
      description,
      location,
      workday,
      modality,
      requirements
    }))

    await auditAdminAction({
      request,
      actor: {
        id: session.user?.id,
        email: session.user?.email
      },
      action: 'vacancy.create',
      resourceType: 'vacancy',
      resourceId: springVacancy.id,
      outcome: 'SUCCESS',
      metadata: {
        title: springVacancy.title,
        status: springVacancy.status,
        backend: 'spring'
      }
    })
    revalidatePublicVacanciesCache()

    return NextResponse.json(springVacancy, { status: 201 })
  } catch (error) {
    if (error instanceof SpringVacancyWriteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'vacancy.create',
      resourceType: 'vacancy',
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al crear vacante', error)
    return NextResponse.json(
      { error: 'Error al crear vacante' },
      { status: 500 }
    )
  }
}
