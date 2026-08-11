import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { formatValidationError, routeIdSchema, updateVacancySchema } from '@/lib/apiValidation'
import { normalizeLocation } from '@/lib/utils'
import { revalidatePublicVacanciesCache } from '@/lib/server/publicVacancies'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
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

class SpringVacancyDeniedError extends Error {
  constructor(readonly response: Response) {
    super('Spring backend denied vacancy mutation')
  }
}

async function relaySpringVacancyDenial(response: Response) {
  return relaySpringCookies(
    new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' }
    }),
    response.headers
  )
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
  mutationHeaders: Headers | undefined
) {
  const response = cause instanceof SpringVacancyNotFoundError
    ? NextResponse.json({ error: 'Vacante no encontrada' }, { status: 404 })
    : cause instanceof SpringVacancyWriteError
      ? NextResponse.json({ error: cause.message }, { status: cause.status })
      : undefined

  if (!response) return undefined
  return relaySpringCookies(response, mutationHeaders)
}

async function closeVacancyInSpring(id: string, request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/close`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
    }
  })

  try {
    if (response.status === 401 || response.status === 403) {
      throw new SpringVacancyDeniedError(response)
    }
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

async function activateVacancyInSpring(id: string, request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/activate`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
    }
  })

  try {
    if (response.status === 401 || response.status === 403) {
      throw new SpringVacancyDeniedError(response)
    }
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

async function deactivateVacancyInSpring(id: string, request: NextRequest) {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for vacancy operations')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies/${id}/deactivate`, {
    method: 'PATCH',
    headers: {
      ...getSpringBackendHeaders(),
      ...getAllowedBffRequestHeaders(request),
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
    }
  })

  try {
    if (response.status === 401 || response.status === 403) {
      throw new SpringVacancyDeniedError(response)
    }
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
  request: NextRequest
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
      ...(request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {})
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new SpringVacancyDeniedError(response)
    }
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
  let mutationHeaders: Headers | undefined
  try {
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
      let statusMutation
      try {
        statusMutation = requestedStatus === 'ACTIVE'
          ? await activateVacancyInSpring(id, request)
          : requestedStatus === 'INACTIVE'
            ? await deactivateVacancyInSpring(id, request)
            : await closeVacancyInSpring(id, request)
      } catch (error) {
        const cause = error instanceof SpringVacancyMutationError ? error.cause : error
        const errorHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
        if (cause instanceof SpringVacancyDeniedError) return relaySpringVacancyDenial(cause.response)
        const errorResponse = preservedSpringMutationErrorResponse(cause, errorHeaders)
        if (errorResponse) return errorResponse
        mutationHeaders = errorHeaders
        throw cause
      }

      const vacancy = statusMutation.vacancy
      mutationHeaders = statusMutation.headers
      if (vacancy) {
        revalidatePublicVacanciesCache()

        const response = NextResponse.json(vacancy)
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
      let springVacancy = null
      try {
        const mutation = await updateVacancyInSpring(id, buildUpdatePayload({
          title: bodyValidation.data.title,
          description: bodyValidation.data.description,
          location: originalLocation,
          workday: bodyValidation.data.workday,
          modality: bodyValidation.data.modality,
          requirements: bodyValidation.data.requirements
        }), request)
        springVacancy = mutation.vacancy
        mutationHeaders = mutation.headers
      } catch (error) {
        const cause = error instanceof SpringVacancyMutationError ? error.cause : error
        mutationHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
        if (cause instanceof SpringVacancyDeniedError) return relaySpringVacancyDenial(cause.response)
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
        revalidatePublicVacanciesCache()

        const response = NextResponse.json(springVacancy)
        return relaySpringCookies(response, mutationHeaders)
      }
    }

    throw new Error('Spring backend did not complete the vacancy update')
  } catch (error) {
    const failureMetadata = springMutationFailureMetadata(error)
    logger.error('Error al actualizar vacante', error, failureMetadata)
    const response = NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    )
    if (mutationHeaders) {
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
  let mutationHeaders: Headers | undefined
  try {
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

    let closedVacancy = null
    try {
      const mutation = await closeVacancyInSpring(id, request)
      closedVacancy = mutation.vacancy
      mutationHeaders = mutation.headers
    } catch (error) {
      const cause = error instanceof SpringVacancyMutationError ? error.cause : error
      const errorHeaders = error instanceof SpringVacancyMutationError ? error.headers : undefined
      if (cause instanceof SpringVacancyDeniedError) return relaySpringVacancyDenial(cause.response)
      const errorResponse = preservedSpringMutationErrorResponse(cause, errorHeaders)
      if (errorResponse) return errorResponse
      mutationHeaders = errorHeaders
      throw cause
    }

    if (closedVacancy) {
      revalidatePublicVacanciesCache()

      const response = NextResponse.json(closedVacancy)
      return relaySpringCookies(response, mutationHeaders)
    }
  } catch (error) {
    const failureMetadata = springMutationFailureMetadata(error)
    logger.error('Error al cerrar vacante', error, failureMetadata)
    const response = NextResponse.json(
      { error: 'Error al cerrar vacante' },
      { status: 500 }
    )
    if (mutationHeaders) {
      relaySpringCookies(response, mutationHeaders)
    }
    return response
  }
}
