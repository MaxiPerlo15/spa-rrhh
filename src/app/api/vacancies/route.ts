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
import { getSpringSession } from '@/lib/springSession'

async function createVacancyInSpring(data: ReturnType<typeof buildCreatePayload>, cookie: string, request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy creation')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getSpringBackendHeaders(),
      Cookie: cookie,
      ...requestContextHeaders(request)
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

function requestContextHeaders(request: NextRequest): Record<string, string> {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = request.headers.get('user-agent')?.trim()
  return {
    ...(forwardedFor && /^[0-9a-f:.]+$/i.test(forwardedFor) ? { 'X-Forwarded-For': forwardedFor } : {}),
    ...(userAgent && userAgent.length <= 512 && !/[\r\n]/.test(userAgent) ? { 'User-Agent': userAgent } : {})
  }
}

function json(body: unknown, status: number, setCookie?: string) {
  return NextResponse.json(body, { status, headers: setCookie ? { 'Set-Cookie': setCookie } : undefined })
}

function relayCookie(response: Response, setCookie?: string) {
  if (setCookie) response.headers.set('Set-Cookie', setCookie)
  return response
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
  let setCookie: string | undefined
  try {
    if (!getBackendUrl()) {
      return json({ error: 'Vacancy backend not configured' }, 503)
    }

    const sessionId = request.cookies.get('SESSIONID')?.value
    if (!sessionId) return json({ error: 'No autorizado' }, 401)
    const session = await getSpringSession(`SESSIONID=${sessionId}`)
    if (session.state === 'anonymous') return json({ error: 'No autorizado' }, 401, session.setCookie)
    if (session.state === 'forbidden') return json({ error: 'No autorizado' }, 403)
    if (session.state === 'unavailable') return json({ error: 'Spring backend unavailable' }, 503)
    setCookie = session.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) return relayCookie(originRejection, setCookie)

    const body = await request.json()
    const bodyValidation = createVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return json(formatValidationError(bodyValidation.error), 400, setCookie)
    }
    const { title, description, location, workday, modality, salary, requirements, benefits } = bodyValidation.data

    const unsupportedFields = getUnsupportedSpringVacancyFields({ salary, benefits })
    if (unsupportedFields.length > 0) {
      return relayCookie(rejectUnsupportedSpringVacancyFields(unsupportedFields), setCookie)
    }

    const springVacancy = await createVacancyInSpring(buildCreatePayload({
      title,
      description,
      location,
      workday,
      modality,
      requirements
    }), setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`, request)
    revalidatePublicVacanciesCache()

    return json(springVacancy, 201, setCookie)
  } catch (error) {
    if (error instanceof SpringVacancyWriteError) {
      return json({ error: error.message }, error.status, setCookie)
    }

    logger.error('Error al crear vacante', error)
    return json({ error: 'Error al crear vacante' }, 500, setCookie)
  }
}
