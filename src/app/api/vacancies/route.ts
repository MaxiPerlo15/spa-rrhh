import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
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
import { getAllowedBffRequestHeaders, relaySpringCookies } from '@/lib/server/adminBffBoundary'

class SpringVacancyDeniedError extends Error {
  constructor(readonly response: Response) {
    super('Spring backend denied vacancy creation')
  }
}

class SpringVacancyWriteResponseError extends SpringVacancyWriteError {
  constructor(status: number, message: string, readonly headers: Headers) {
    super(status, message)
  }
}

class SpringVacancyFailureError extends Error {
  constructor(readonly headers: Headers, message: string) {
    super(message)
  }
}

async function createVacancyInSpring(data: ReturnType<typeof buildCreatePayload>, request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy creation')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new SpringVacancyDeniedError(response)
    }
    const errorBody = await response.text()
    if (response.status === 400 || response.status === 404 || response.status === 409) {
      throw new SpringVacancyWriteResponseError(
        response.status,
        parseSpringError(errorBody) || 'No se pudo crear la vacante por una regla de negocio',
        response.headers
      )
    }
    throw new SpringVacancyFailureError(
      response.headers,
      `Spring backend rejected vacancy creation (${response.status}): ${errorBody}`
    )
  }

  return { vacancy: mapSpringToDto(await response.json() as SpringVacancyResponse), headers: response.headers }
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status })
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
  try {
    if (!getBackendUrl()) {
      return json({ error: 'Vacancy backend not configured' }, 503)
    }

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) return originRejection

    const body = await request.json()
    const bodyValidation = createVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return json(formatValidationError(bodyValidation.error), 400)
    }
    const { title, description, location, workday, modality, salary, requirements, benefits } = bodyValidation.data

    const unsupportedFields = getUnsupportedSpringVacancyFields({ salary, benefits })
    if (unsupportedFields.length > 0) {
      return rejectUnsupportedSpringVacancyFields(unsupportedFields)
    }

    const springResponse = await createVacancyInSpring(buildCreatePayload({
      title,
      description,
      location,
      workday,
      modality,
      requirements
    }), request)
    revalidatePublicVacanciesCache()

    return relaySpringCookies(NextResponse.json(springResponse.vacancy, { status: 201 }), springResponse.headers)
  } catch (error) {
    if (error instanceof SpringVacancyDeniedError) {
      const body = await error.response.text()
      return relaySpringCookies(
        new NextResponse(body, {
          status: error.response.status,
          headers: { 'Content-Type': error.response.headers.get('content-type') ?? 'application/json' }
        }),
        error.response.headers
      )
    }
    if (error instanceof SpringVacancyWriteResponseError) {
      return relaySpringCookies(
        NextResponse.json({ error: error.message }, { status: error.status }),
        error.headers
      )
    }
    if (error instanceof SpringVacancyFailureError) {
      logger.error('Error al crear vacante', error)
      return relaySpringCookies(
        json({ error: 'Error al crear vacante' }, 500),
        error.headers
      )
    }

    logger.error('Error al crear vacante', error)
    return json({ error: 'Error al crear vacante' }, 500)
  }
}
