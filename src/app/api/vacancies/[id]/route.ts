import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateVacancySchema } from '@/lib/apiValidation'
import { normalizeLocation } from '@/lib/utils'
import { revalidatePublicVacanciesCache } from '@/lib/server/publicVacancies'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import {
  type SpringVacancyResponse,
  mapSpringToDto,
  buildUpdatePayload,
  parseSpringError,
  getUnsupportedSpringVacancyFields,
  rejectUnsupportedSpringVacancyFields,
  SpringVacancyWriteError
} from '@/lib/server/springVacancyGateway'
import { getSpringSession } from '@/lib/springSession'

class SpringVacancyNotFoundError extends Error {
  constructor(id: string) {
    super(`Spring vacancy not found: ${id}`)
    this.name = 'SpringVacancyNotFoundError'
  }
}

async function rejectFailedSpringVacancyStatusMutation(
  response: Response,
  id: string,
  action: string,
  businessRuleFallback: string
) {
  if (response.status === 404) {
    throw new SpringVacancyNotFoundError(id)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    if (response.status === 400 || response.status === 409) {
      const message = parseSpringError(errorBody) || businessRuleFallback
      throw new SpringVacancyWriteError(response.status, message)
    }
    throw new Error(`Spring backend rejected vacancy ${action} (${response.status}): ${errorBody}`)
  }
}

async function closeVacancyInSpring(id: string, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/close`, {
    method: 'PATCH',
    headers: { ...getSpringBackendHeaders(), Cookie: cookie }
  })

  await rejectFailedSpringVacancyStatusMutation(
    response,
    id,
    'close',
    'No se pudo cerrar la vacante por una regla de negocio'
  )

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function getVacancyFromSpring(id: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}`, {
    method: 'GET',
    headers: getSpringBackendHeaders()
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Spring backend rejected vacancy lookup (${response.status}): ${errorBody}`)
  }

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function activateVacancyInSpring(id: string, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/activate`, {
    method: 'PATCH',
    headers: { ...getSpringBackendHeaders(), Cookie: cookie }
  })

  await rejectFailedSpringVacancyStatusMutation(
    response,
    id,
    'activation',
    'No se pudo activar la vacante por una regla de negocio'
  )

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function deactivateVacancyInSpring(id: string, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/deactivate`, {
    method: 'PATCH',
    headers: { ...getSpringBackendHeaders(), Cookie: cookie }
  })

  await rejectFailedSpringVacancyStatusMutation(
    response,
    id,
    'deactivation',
    'No se pudo desactivar la vacante por una regla de negocio'
  )

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function updateVacancyInSpring(
  id: string,
  data: ReturnType<typeof buildUpdatePayload>,
  cookie: string
) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
        ...getSpringBackendHeaders(),
        Cookie: cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    await rejectFailedSpringVacancyStatusMutation(
      response,
      id,
      'update',
      'No se pudo actualizar la vacante por una regla de negocio'
    )
  }

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AuthorizedSession = { cookie: string; setCookie?: string }

function relayCookie(response: NextResponse, setCookie?: string) {
  if (setCookie) response.headers.set('Set-Cookie', setCookie)
  return response
}

async function getAuthorizedSessionCookie(request: NextRequest): Promise<AuthorizedSession | NextResponse> {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') {
    return relayCookie(NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session.setCookie)
  }
  if (session.state === 'forbidden') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (session.state === 'unavailable') return NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 })
  return { cookie: session.setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`, setCookie: session.setCookie }
}

// GET /api/vacancies/[id] - Obtener una vacante específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data

    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Vacancy backend not configured' },
        { status: 503 }
      )
    }

    const session = await auth()
    const isAdmin = session?.user?.role === 'ADMIN'

    const springVacancy = await getVacancyFromSpring(id)
    if (!springVacancy || (!isAdmin && springVacancy.status !== 'active')) {
      return NextResponse.json(
        { error: 'Vacante no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(springVacancy)
  } catch (error) {
    logger.error('Error al obtener vacante', error)
    return NextResponse.json(
      { error: 'Error al obtener vacante' },
      { status: 500 }
    )
  }
}

// Función compartida para actualizar vacante
async function updateVacancy(request: NextRequest, params: Promise<{ id: string }>) {
  let authorizedSetCookie: string | undefined
  try {
    if (!getBackendUrl()) return NextResponse.json({ error: 'Vacancy backend not configured' }, { status: 503 })
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data

    const body = await request.json()
    const bodyValidation = updateVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    const unsupportedFields = getUnsupportedSpringVacancyFields(bodyValidation.data)
    if (unsupportedFields.length > 0) {
      return rejectUnsupportedSpringVacancyFields(unsupportedFields)
    }

    const normalizedBody = { ...bodyValidation.data }
    const originalLocation = bodyValidation.data.location
    if (normalizedBody.location) {
      normalizedBody.location = normalizeLocation(normalizedBody.location)
    }

    const requestedStatus = normalizedBody.status
    const isOnlyStatusChange = Object.keys(normalizedBody).length === 1 && requestedStatus !== undefined
    const hasBusinessFieldChange = Object.keys(normalizedBody).some((key) => key !== 'status')

    if (requestedStatus !== undefined && hasBusinessFieldChange) {
      return NextResponse.json(
        { error: 'La modificación de datos y el cambio de estado deben realizarse por operaciones separadas' },
        { status: 400 }
      )
    }

    if (isOnlyStatusChange && (requestedStatus === 'ACTIVE' || requestedStatus === 'INACTIVE' || requestedStatus === 'CLOSED')) {
      let vacancy = null
      try {
        vacancy = requestedStatus === 'ACTIVE'
          ? await activateVacancyInSpring(id, sessionCookie.cookie)
          : requestedStatus === 'INACTIVE'
            ? await deactivateVacancyInSpring(id, sessionCookie.cookie)
            : await closeVacancyInSpring(id, sessionCookie.cookie)
      } catch (error) {
        if (error instanceof SpringVacancyNotFoundError) {
          return NextResponse.json(
            { error: 'Vacante no encontrada' },
            { status: 404 }
          )
        }
        if (error instanceof SpringVacancyWriteError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status }
          )
        }
        throw error
      }

      if (vacancy) {
        revalidatePublicVacanciesCache()

        return relayCookie(NextResponse.json(vacancy), authorizedSetCookie)
      }
    }

    if (isOnlyStatusChange) {
      return NextResponse.json(
        { error: 'Cambio de estado no soportado por el backend configurado' },
        { status: 400 }
      )
    }

    if (hasBusinessFieldChange) {
      let springVacancy = null
      try {
        springVacancy = await updateVacancyInSpring(id, buildUpdatePayload({
          title: bodyValidation.data.title,
          description: bodyValidation.data.description,
          location: originalLocation,
          workday: bodyValidation.data.workday,
          modality: bodyValidation.data.modality,
          requirements: bodyValidation.data.requirements
        }), sessionCookie.cookie)
      } catch (error) {
        if (error instanceof SpringVacancyNotFoundError) {
          return NextResponse.json(
            { error: 'Vacante no encontrada' },
            { status: 404 }
          )
        }
        if (error instanceof SpringVacancyWriteError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status }
          )
        }
        throw error
      }

      if (springVacancy) {
        revalidatePublicVacanciesCache()

        return relayCookie(NextResponse.json(springVacancy), authorizedSetCookie)
      }
    }

    throw new Error('Spring backend did not complete the vacancy update')
  } catch (error) {
    logger.error('Error al actualizar vacante', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}

// PUT /api/vacancies/[id] - Actualizar vacante (admin)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  return updateVacancy(request, params)
}

// PATCH /api/vacancies/[id] - Actualizar vacante parcialmente (admin)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  return updateVacancy(request, params)
}

// DELETE /api/vacancies/[id] - Cerrar vacante conservando su historial (admin)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined
  try {
    if (!getBackendUrl()) return NextResponse.json({ error: 'Vacancy backend not configured' }, { status: 503 })
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data

    let closedVacancy = null
    try {
      closedVacancy = await closeVacancyInSpring(id, sessionCookie.cookie)
    } catch (error) {
      if (error instanceof SpringVacancyNotFoundError) {
        return NextResponse.json(
          { error: 'Vacante no encontrada' },
          { status: 404 }
        )
      }
      if (error instanceof SpringVacancyWriteError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        )
      }
      throw error
    }

    if (closedVacancy) {
      revalidatePublicVacanciesCache()

      return relayCookie(NextResponse.json(closedVacancy), authorizedSetCookie)
    }
  } catch (error) {
    logger.error('Error al cerrar vacante', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al cerrar vacante' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}
