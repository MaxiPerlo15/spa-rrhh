import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { auditAdminAction } from '@/lib/adminAudit'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateVacancySchema } from '@/lib/apiValidation'
import { normalizeLocation } from '@/lib/utils'
import { revalidatePublicVacanciesCache } from '@/lib/server/publicVacancies'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'
import { getAllowedBffRequestHeaders, relaySpringCookies } from '@/lib/server/adminBffBoundary'
import {
  type SpringVacancyResponse,
  mapSpringToDto,
  buildUpdatePayload,
  parseSpringError,
  getUnsupportedSpringVacancyFields,
  rejectUnsupportedSpringVacancyFields,
  SpringVacancyWriteError
} from '@/lib/server/springVacancyGateway'

class SpringVacancyNotFoundError extends Error {
  constructor(id: string) {
    super(`Spring vacancy not found: ${id}`)
    this.name = 'SpringVacancyNotFoundError'
  }
}

class SpringVacancyMutationError extends Error {
  constructor(readonly headers: Headers, readonly cause: unknown) {
    super('Spring vacancy mutation failed')
    this.name = 'SpringVacancyMutationError'
  }
}

class SpringVacancyMutationFailureError extends Error {
  readonly category = 'spring_mutation_failure'

  constructor(readonly status: number) {
    super('Spring vacancy mutation failed')
    this.name = 'SpringVacancyMutationFailureError'
  }
}

async function rejectFailedSpringVacancyStatusMutation(
  response: Response,
  id: string,
  businessRuleFallback: string
) {
  if (response.status === 404) {
    throw new SpringVacancyNotFoundError(id)
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 409) {
      const errorBody = await response.text()
      const message = parseSpringError(errorBody) || businessRuleFallback
      throw new SpringVacancyWriteError(response.status, message)
    }
    throw new SpringVacancyMutationFailureError(response.status)
  }
}

function springMutationFailureMetadata(error: unknown) {
  if (error instanceof SpringVacancyMutationFailureError) {
    return { category: error.category, status: error.status }
  }

  return undefined
}

function preservedSpringMutationErrorResponse(
  cause: unknown,
  authorizedSetCookie: string | undefined,
  mutationHeaders: Headers | undefined
) {
  const response = cause instanceof SpringVacancyNotFoundError
    ? NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
    : cause instanceof SpringVacancyWriteError
      ? NextResponse.json({ error: cause.message }, { status: cause.status })
      : undefined

  if (!response) return undefined
  relaySpringCookies(response, authorizedSetCookie)
  return relaySpringCookies(response, mutationHeaders)
}

async function closeVacancyInSpring(id: string, request: NextRequest, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/close`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      Cookie: cookie
    }
  })

  try {
    await rejectFailedSpringVacancyStatusMutation(
      response,
      id,
      'No se pudo cerrar la vacante por una regla de negocio'
    )
  } catch (error) {
    throw new SpringVacancyMutationError(response.headers, error)
  }

  return {
    vacancy: mapSpringToDto(await response.json() as SpringVacancyResponse),
    headers: response.headers
  }
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

async function activateVacancyInSpring(id: string, request: NextRequest, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/activate`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      Cookie: cookie
    }
  })

  try {
    await rejectFailedSpringVacancyStatusMutation(
      response,
      id,
      'No se pudo activar la vacante por una regla de negocio'
    )
  } catch (error) {
    throw new SpringVacancyMutationError(response.headers, error)
  }

  return {
    vacancy: mapSpringToDto(await response.json() as SpringVacancyResponse),
    headers: response.headers
  }
}

async function deactivateVacancyInSpring(id: string, request: NextRequest, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/deactivate`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      Cookie: cookie
    }
  })

  try {
    await rejectFailedSpringVacancyStatusMutation(
      response,
      id,
      'No se pudo desactivar la vacante por una regla de negocio'
    )
  } catch (error) {
    throw new SpringVacancyMutationError(response.headers, error)
  }

  return {
    vacancy: mapSpringToDto(await response.json() as SpringVacancyResponse),
    headers: response.headers
  }
}

async function updateVacancyInSpring(
  id: string,
  data: ReturnType<typeof buildUpdatePayload>,
  request: NextRequest,
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
      ...getAllowedBffRequestHeaders(request),
      Cookie: cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    try {
        await rejectFailedSpringVacancyStatusMutation(
          response,
          id,
          'No se pudo actualizar la vacante por una regla de negocio'
      )
    } catch (error) {
      throw new SpringVacancyMutationError(response.headers, error)
    }
  }

  return {
    vacancy: mapSpringToDto(await response.json() as SpringVacancyResponse),
    headers: response.headers
  }
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

async function authorizeSpringMutation(request: NextRequest) {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') {
    const response = NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    relaySpringCookies(response, session.setCookie)
    return response
  }
  if (session.state === 'forbidden') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (session.state === 'unavailable') return NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 })

  return {
    cookie: session.setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`,
    setCookie: session.setCookie
  }
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
  let session = null as Awaited<ReturnType<typeof auth>>
  let resourceId: string | undefined
  let authorizedSetCookie: string | undefined
  let mutationHeaders: Headers | undefined
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
        action: 'vacancy.update',
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

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    resourceId = id

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
      const springSession = await authorizeSpringMutation(request)
      if (springSession instanceof NextResponse) return springSession
      authorizedSetCookie = springSession.setCookie

      let statusMutation
      try {
        statusMutation = requestedStatus === 'ACTIVE'
          ? await activateVacancyInSpring(id, request, springSession.cookie)
          : requestedStatus === 'INACTIVE'
            ? await deactivateVacancyInSpring(id, request, springSession.cookie)
            : await closeVacancyInSpring(id, request, springSession.cookie)
      } catch (error) {
        const cause = error instanceof SpringVacancyMutationError ? error.cause : error
        const errorHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
        const errorResponse = preservedSpringMutationErrorResponse(cause, authorizedSetCookie, errorHeaders)
        if (errorResponse) return errorResponse
        mutationHeaders = errorHeaders
        throw cause
      }

      const vacancy = statusMutation.vacancy
      mutationHeaders = statusMutation.headers
      if (vacancy) {
        await auditAdminAction({
          request,
          actor: {
            id: session.user?.id,
            email: session.user?.email
          },
          action: requestedStatus === 'ACTIVE'
            ? 'vacancy.activate'
            : requestedStatus === 'INACTIVE'
              ? 'vacancy.deactivate'
              : 'vacancy.close',
          resourceType: 'vacancy',
          resourceId: vacancy.id,
          outcome: 'SUCCESS',
          metadata: {
            title: vacancy.title,
            newStatus: vacancy.status,
            backend: 'spring'
          }
        })
        revalidatePublicVacanciesCache()

        const response = NextResponse.json(vacancy)
        relaySpringCookies(response, authorizedSetCookie)
        return relaySpringCookies(response, mutationHeaders)
      }
    }

    if (isOnlyStatusChange) {
      return NextResponse.json(
        { error: 'Cambio de estado no soportado por el backend configurado' },
        { status: 400 }
      )
    }

    if (hasBusinessFieldChange) {
      const springSession = await authorizeSpringMutation(request)
      if (springSession instanceof NextResponse) return springSession
      authorizedSetCookie = springSession.setCookie

      let springVacancy = null
      try {
        const mutation = await updateVacancyInSpring(id, buildUpdatePayload({
          title: bodyValidation.data.title,
          description: bodyValidation.data.description,
          location: originalLocation,
          workday: bodyValidation.data.workday,
          modality: bodyValidation.data.modality,
          requirements: bodyValidation.data.requirements
        }), request, springSession.cookie)
        springVacancy = mutation.vacancy
        mutationHeaders = mutation.headers
      } catch (error) {
        const cause = error instanceof SpringVacancyMutationError ? error.cause : error
        mutationHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
        if (cause instanceof SpringVacancyNotFoundError) {
          return NextResponse.json(
            { error: 'Vacante no encontrada' },
            { status: 404 }
          )
        }
        if (cause instanceof SpringVacancyWriteError) {
          return NextResponse.json(
            { error: cause.message },
            { status: cause.status }
          )
        }
        throw cause
      }

      if (springVacancy) {
        await auditAdminAction({
          request,
          actor: {
            id: session.user?.id,
            email: session.user?.email
          },
          action: 'vacancy.update',
          resourceType: 'vacancy',
          resourceId: springVacancy.id,
          outcome: 'SUCCESS',
          metadata: {
            changedFields: Object.keys(normalizedBody).filter((field) => field !== 'status'),
            title: springVacancy.title,
            backend: 'spring'
          }
        })
        revalidatePublicVacanciesCache()

        const response = NextResponse.json(springVacancy)
        relaySpringCookies(response, springSession.setCookie)
        return relaySpringCookies(response, mutationHeaders)
      }
    }

    throw new Error('Spring backend did not complete the vacancy update')
  } catch (error) {
    const failureMetadata = springMutationFailureMetadata(error)
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'vacancy.update',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        ...(failureMetadata ?? { error: error instanceof Error ? error.message : String(error) })
      }
    })
    logger.error('Error al actualizar vacante', error, failureMetadata)
    const response = NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    )
    if (mutationHeaders) {
      relaySpringCookies(response, authorizedSetCookie)
      relaySpringCookies(response, mutationHeaders)
    }
    return response
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
  let session = null as Awaited<ReturnType<typeof auth>>
  let resourceId: string | undefined
  let authorizedSetCookie: string | undefined
  let mutationHeaders: Headers | undefined
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
        action: 'vacancy.close',
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

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    resourceId = id

    let closedVacancy = null
    try {
      const springSession = await authorizeSpringMutation(request)
      if (springSession instanceof NextResponse) return springSession
      authorizedSetCookie = springSession.setCookie
      const mutation = await closeVacancyInSpring(id, request, springSession.cookie)
      closedVacancy = mutation.vacancy
      mutationHeaders = mutation.headers
    } catch (error) {
      const cause = error instanceof SpringVacancyMutationError ? error.cause : error
      const errorHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
      const errorResponse = preservedSpringMutationErrorResponse(cause, authorizedSetCookie, errorHeaders)
      if (errorResponse) return errorResponse
      mutationHeaders = errorHeaders
      throw cause
    }

    if (closedVacancy) {
      await auditAdminAction({
        request,
        actor: {
          id: session.user?.id,
          email: session.user?.email
        },
        action: 'vacancy.close',
        resourceType: 'vacancy',
        resourceId: id,
        outcome: 'SUCCESS',
        metadata: {
          title: closedVacancy.title,
          newStatus: closedVacancy.status,
          backend: 'spring'
        }
      })
      revalidatePublicVacanciesCache()

      const response = NextResponse.json(closedVacancy)
      relaySpringCookies(response, authorizedSetCookie)
      return relaySpringCookies(response, mutationHeaders)
    }
  } catch (error) {
    const failureMetadata = springMutationFailureMetadata(error)
    await auditAdminAction({
      request,
      actor: {
        id: session?.user?.id,
        email: session?.user?.email
      },
      action: 'vacancy.close',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        ...(failureMetadata ?? { error: error instanceof Error ? error.message : String(error) })
      }
    })
    logger.error('Error al cerrar vacante', error, failureMetadata)
    const response = NextResponse.json(
      { error: 'Error al cerrar vacante' },
      { status: 500 }
    )
    if (mutationHeaders) {
      relaySpringCookies(response, authorizedSetCookie)
      relaySpringCookies(response, mutationHeaders)
    }
    return response
  }
}
