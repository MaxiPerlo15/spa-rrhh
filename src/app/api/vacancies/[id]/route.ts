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
import {
  getAllowedBffRequestHeaders,
  relaySpringCookies,
  type SpringCookieSource
} from '@/lib/server/adminBffBoundary'
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
  constructor(readonly response: Response, readonly cause: unknown) {
    super('Spring vacancy mutation failed')
    this.name = 'SpringVacancyMutationError'
  }
}

const springMutationResponses = new WeakMap<object, Response>()

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

async function parseSpringVacancyMutation(
  response: Response,
  id: string,
  action: string,
  businessRuleFallback: string
): Promise<ReturnType<typeof mapSpringToDto>> {
  try {
    await rejectFailedSpringVacancyStatusMutation(response, id, action, businessRuleFallback)
  } catch (error) {
    throw new SpringVacancyMutationError(response, error)
  }

  const vacancy = mapSpringToDto(await response.json() as SpringVacancyResponse)
  springMutationResponses.set(vacancy, response)
  return vacancy
}

async function closeVacancyInSpring(id: string, request: NextRequest, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/close`, {
    method: 'PATCH',
    headers: { ...getSpringBackendHeaders(), ...getAllowedBffRequestHeaders(request), Cookie: cookie }
  })

  return parseSpringVacancyMutation(response, id, 'close', 'No se pudo cerrar la vacante por una regla de negocio')
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
    headers: { ...getSpringBackendHeaders(), ...getAllowedBffRequestHeaders(request), Cookie: cookie }
  })

  return parseSpringVacancyMutation(response, id, 'activation', 'No se pudo activar la vacante por una regla de negocio')
}

async function deactivateVacancyInSpring(id: string, request: NextRequest, cookie: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/deactivate`, {
    method: 'PATCH',
    headers: { ...getSpringBackendHeaders(), ...getAllowedBffRequestHeaders(request), Cookie: cookie }
  })

  return parseSpringVacancyMutation(response, id, 'deactivation', 'No se pudo desactivar la vacante por una regla de negocio')
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

  return parseSpringVacancyMutation(response, id, 'update', 'No se pudo actualizar la vacante por una regla de negocio')
}

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AuthorizedSession = {
  cookie: string
  setCookie?: string
  actor: { id: string; email: string }
}

function relayCookies(response: NextResponse, ...sources: SpringCookieSource[]) {
  for (const source of sources) relaySpringCookies(response, source)
  return response
}

async function getAuthorizedSessionCookie(request: NextRequest): Promise<AuthorizedSession | NextResponse> {
  const sessionId = request.cookies.get('SESSIONID')?.value
  if (!sessionId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const session = await getSpringSession(`SESSIONID=${sessionId}`)
  if (session.state === 'anonymous') {
    return relayCookies(NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session.setCookie)
  }
  if (session.state === 'forbidden') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (session.state === 'unavailable') return NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 })

  return {
    cookie: session.setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`,
    setCookie: session.setCookie,
    actor: { id: session.user.userId, email: session.user.email }
  }
}

function getMutationFailure(error: unknown) {
  if (error instanceof SpringVacancyMutationError) {
    return { cause: error.cause, cookies: error.response.headers }
  }
  return { cause: error, cookies: undefined }
}

function getSpringMutationResponseHeaders(vacancy: object) {
  return springMutationResponses.get(vacancy)?.headers
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
  let actor: AuthorizedSession['actor'] | undefined
  let resourceId: string | undefined
  try {
    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Vacancy backend not configured' },
        { status: 503 }
      )
    }

    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie
    actor = sessionCookie.actor

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) return relayCookies(originRejection, authorizedSetCookie)

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return relayCookies(NextResponse.json(formatValidationError(parsedParams.error), { status: 400 }), authorizedSetCookie)
    }
    const { id } = parsedParams.data
    resourceId = id

    const body = await request.json()
    const bodyValidation = updateVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return relayCookies(NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 }), authorizedSetCookie)
    }

    const unsupportedFields = getUnsupportedSpringVacancyFields(bodyValidation.data)
    if (unsupportedFields.length > 0) {
      return relayCookies(rejectUnsupportedSpringVacancyFields(unsupportedFields), authorizedSetCookie)
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
      return relayCookies(NextResponse.json(
        { error: 'La modificación de datos y el cambio de estado deben realizarse por operaciones separadas' },
        { status: 400 }
      ), authorizedSetCookie)
    }

    if (isOnlyStatusChange && (requestedStatus === 'ACTIVE' || requestedStatus === 'INACTIVE' || requestedStatus === 'CLOSED')) {
      let vacancy = null
      try {
        vacancy = requestedStatus === 'ACTIVE'
          ? await activateVacancyInSpring(id, request, sessionCookie.cookie)
          : requestedStatus === 'INACTIVE'
            ? await deactivateVacancyInSpring(id, request, sessionCookie.cookie)
            : await closeVacancyInSpring(id, request, sessionCookie.cookie)
      } catch (error) {
        const { cause, cookies } = getMutationFailure(error)
        if (cause instanceof SpringVacancyNotFoundError) {
          return relayCookies(NextResponse.json(
            { error: 'Vacante no encontrada' },
            { status: 404 }
          ), authorizedSetCookie, cookies)
        }
        if (cause instanceof SpringVacancyWriteError) {
          return relayCookies(NextResponse.json(
            { error: cause.message },
            { status: cause.status }
          ), authorizedSetCookie, cookies)
        }
        throw error
      }

      if (vacancy) {
        await auditAdminAction({
          request,
          actor,
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

        return relayCookies(NextResponse.json(vacancy), authorizedSetCookie, getSpringMutationResponseHeaders(vacancy))
      }
    }

    if (isOnlyStatusChange) {
      return relayCookies(NextResponse.json(
        { error: 'Cambio de estado no soportado por el backend configurado' },
        { status: 400 }
      ), authorizedSetCookie)
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
        }), request, sessionCookie.cookie)
      } catch (error) {
        const { cause, cookies } = getMutationFailure(error)
        if (cause instanceof SpringVacancyNotFoundError) {
          return relayCookies(NextResponse.json(
            { error: 'Vacante no encontrada' },
            { status: 404 }
          ), authorizedSetCookie, cookies)
        }
        if (cause instanceof SpringVacancyWriteError) {
          return relayCookies(NextResponse.json(
            { error: cause.message },
            { status: cause.status }
          ), authorizedSetCookie, cookies)
        }
        throw error
      }

      if (springVacancy) {
        await auditAdminAction({
          request,
          actor,
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

        return relayCookies(NextResponse.json(springVacancy), authorizedSetCookie, getSpringMutationResponseHeaders(springVacancy))
      }
    }

    throw new Error('Spring backend did not complete the vacancy update')
  } catch (error) {
    await auditAdminAction({
      request,
      actor,
      action: 'vacancy.update',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al actualizar vacante', error)
    return relayCookies(NextResponse.json(
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
  let actor: AuthorizedSession['actor'] | undefined
  let resourceId: string | undefined
  try {
    if (!getBackendUrl()) {
      return NextResponse.json(
        { error: 'Vacancy backend not configured' },
        { status: 503 }
      )
    }

    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie
    actor = sessionCookie.actor

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) return relayCookies(originRejection, authorizedSetCookie)

    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return relayCookies(NextResponse.json(formatValidationError(parsedParams.error), { status: 400 }), authorizedSetCookie)
    }
    const { id } = parsedParams.data
    resourceId = id

    let closedVacancy = null
    try {
      closedVacancy = await closeVacancyInSpring(id, request, sessionCookie.cookie)
    } catch (error) {
      const { cause, cookies } = getMutationFailure(error)
      if (cause instanceof SpringVacancyNotFoundError) {
        return relayCookies(NextResponse.json(
          { error: 'Vacante no encontrada' },
          { status: 404 }
        ), authorizedSetCookie, cookies)
      }
      if (cause instanceof SpringVacancyWriteError) {
        return relayCookies(NextResponse.json(
          { error: cause.message },
          { status: cause.status }
        ), authorizedSetCookie, cookies)
      }
      throw error
    }

    if (closedVacancy) {
      await auditAdminAction({
        request,
        actor,
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

      return relayCookies(NextResponse.json(closedVacancy), authorizedSetCookie, getSpringMutationResponseHeaders(closedVacancy))
    }
  } catch (error) {
    await auditAdminAction({
      request,
      actor,
      action: 'vacancy.close',
      resourceType: 'vacancy',
      resourceId,
      outcome: 'ERROR',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al cerrar vacante', error)
    return relayCookies(NextResponse.json(
      { error: 'Error al cerrar vacante' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}
