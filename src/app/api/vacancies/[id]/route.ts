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

async function closeVacancyInSpring(id: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/close`, {
    method: 'PATCH',
    headers: getSpringBackendHeaders()
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

async function activateVacancyInSpring(id: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/activate`, {
    method: 'PATCH',
    headers: getSpringBackendHeaders()
  })

  await rejectFailedSpringVacancyStatusMutation(
    response,
    id,
    'activation',
    'No se pudo activar la vacante por una regla de negocio'
  )

  return mapSpringToDto(await response.json() as SpringVacancyResponse)
}

async function deactivateVacancyInSpring(id: string) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/deactivate`, {
    method: 'PATCH',
    headers: getSpringBackendHeaders()
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
    await rejectFailedSpringVacancyStatusMutation(
      response,
      id,
      'update',
      'No se pudo actualizar la vacante por una regla de negocio'
    )
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
  if (session.state === 'anonymous') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
      let vacancy = null
      try {
        vacancy = requestedStatus === 'ACTIVE'
          ? await activateVacancyInSpring(id)
          : requestedStatus === 'INACTIVE'
            ? await deactivateVacancyInSpring(id)
            : await closeVacancyInSpring(id)
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

        return NextResponse.json(vacancy)
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

      let springVacancy = null
      let mutationHeaders: Headers | undefined
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
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al actualizar vacante', error)
    return NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    )
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
      closedVacancy = await closeVacancyInSpring(id)
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

      return NextResponse.json(closedVacancy)
    }
  } catch (error) {
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
        error: error instanceof Error ? error.message : String(error)
      }
    })
    logger.error('Error al cerrar vacante', error)
    return NextResponse.json(
      { error: 'Error al cerrar vacante' },
      { status: 500 }
    )
  }
}
