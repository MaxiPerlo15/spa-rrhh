import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import {
  formatValidationError,
  routeIdSchema,
  updateContactStatusSchema
} from '@/lib/apiValidation'
import { toContactAdminDto } from '@/lib/dto/contact'
import { getBackendUrl, getSpringBackendHeaders, isSpringAuthEnabled } from '@/lib/server/springBackend'
import { authorizeDashboardRead, relaySpringCookies } from '@/lib/server/adminBffBoundary'
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

type AuthorizedSpringContactMutation = { cookie: string; setCookie?: string }

function relayMutationCookies(
  response: NextResponse,
  authorizedSetCookie?: string,
  mutationHeaders?: Headers
): NextResponse {
  relaySpringCookies(response, authorizedSetCookie)
  relaySpringCookies(response, mutationHeaders)
  return response
}

async function authorizeContactRequest(
  request: NextRequest
): Promise<AuthorizedSpringContactMutation | NextResponse> {
  if (!isSpringAuthEnabled()) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return { cookie: '' }
  }

  if (!request.cookies.get('SESSIONID')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const authorization = await authorizeDashboardRead(request)
  const responseCookie = typeof authorization.responseCookies === 'string'
    ? authorization.responseCookies
    : undefined
  if (authorization.state !== 'authorized') {
    return relayMutationCookies(
      NextResponse.json(
        { error: authorization.state === 'unavailable' ? 'Spring backend unavailable' : 'No autorizado' },
        { status: authorization.status }
      ),
      responseCookie
    )
  }

  return {
    cookie: authorization.cookie,
    setCookie: responseCookie
  }
}

// GET /api/contacts/[id] - Obtener un contacto
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
    const authorization = await authorizeContactRequest(request)
    if (authorization instanceof NextResponse) return authorization

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorization.setCookie)
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'GET',
        headers: {
          ...getSpringBackendHeaders(),
          ...(authorization.cookie ? { Cookie: authorization.cookie } : {})
        }
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact detail', error)
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      ), authorization.setCookie)
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return relayMutationCookies(NextResponse.json(errorJson, { status: springResponse.status }), authorization.setCookie, springResponse.headers)
      } catch {
        const errorBody = await springResponse.text()
        return relayMutationCookies(NextResponse.json(
          { error: errorBody || 'Error al obtener contacto' },
          { status: springResponse.status }
        ), authorization.setCookie, springResponse.headers)
      }
    }

    const contact = await springResponse.json()
    return relayMutationCookies(NextResponse.json(
      toContactAdminDto({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        createdAt: contact.createdAt
      })
    ), authorization.setCookie, springResponse.headers)
  } catch (error) {
    logger.error('Error al obtener contacto', error)
    return NextResponse.json(
      { error: 'Error al obtener contacto' },
      { status: 500 }
    )
  }
}

// PATCH /api/contacts/[id] - Actualizar estado del contacto
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined
  let mutationHeaders: Headers | undefined

  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const authorization = await authorizeContactRequest(request)
    if (authorization instanceof NextResponse) return authorization
    authorizedSetCookie = authorization.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return relayMutationCookies(originRejection, authorizedSetCookie)
    }

    const body = await request.json()
    const bodyValidation = updateContactStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return relayMutationCookies(NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 }), authorizedSetCookie)
    }
    const { status } = bodyValidation.data

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorizedSetCookie)
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders(),
          ...(authorization.cookie ? { Cookie: authorization.cookie } : {})
        },
        body: JSON.stringify({ status })
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact status update', error)
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      ), authorizedSetCookie)
    }
    mutationHeaders = springResponse.headers

    if (!springResponse.ok) {
      const errorBody = await springResponse.text()
      try {
        return relayMutationCookies(NextResponse.json(JSON.parse(errorBody), {
          status: springResponse.status
        }), authorizedSetCookie, mutationHeaders)
      } catch {
        return relayMutationCookies(NextResponse.json(
          { error: errorBody || 'Error al actualizar contacto' },
          { status: springResponse.status }
        ), authorizedSetCookie, mutationHeaders)
      }
    }

    const contact = await springResponse.json()

    return relayMutationCookies(NextResponse.json(
      toContactAdminDto({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        createdAt: contact.createdAt
      })
    ), authorizedSetCookie, mutationHeaders)
  } catch (error) {
    logger.error('Error al actualizar contacto', error)
    return relayMutationCookies(NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    ), authorizedSetCookie, mutationHeaders)
  }
}

// DELETE /api/contacts/[id] - Eliminar contacto
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined
  let mutationHeaders: Headers | undefined

  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const authorization = await authorizeContactRequest(request)
    if (authorization instanceof NextResponse) return authorization
    authorizedSetCookie = authorization.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return relayMutationCookies(originRejection, authorizedSetCookie)
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      ), authorizedSetCookie)
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          ...getSpringBackendHeaders(),
          ...(authorization.cookie ? { Cookie: authorization.cookie } : {})
        }
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact delete', error)
      return relayMutationCookies(NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      ), authorizedSetCookie)
    }
    mutationHeaders = springResponse.headers

    if (!springResponse.ok) {
      const errorBody = await springResponse.text()
      try {
        return relayMutationCookies(NextResponse.json(JSON.parse(errorBody), {
          status: springResponse.status
        }), authorizedSetCookie, mutationHeaders)
      } catch {
        return relayMutationCookies(NextResponse.json(
          { error: errorBody || 'Error al eliminar contacto' },
          { status: springResponse.status }
        ), authorizedSetCookie, mutationHeaders)
      }
    }

    return relayMutationCookies(
      NextResponse.json({ message: 'Contacto eliminado' }),
      authorizedSetCookie,
      mutationHeaders
    )
  } catch (error) {
    logger.error('Error al eliminar contacto', error)
    return relayMutationCookies(NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    ), authorizedSetCookie, mutationHeaders)
  }
}
