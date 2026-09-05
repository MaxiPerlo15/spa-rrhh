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
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { getSpringSession } from '@/lib/springSession'
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
  if (session.state === 'anonymous') return relayCookie(NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session.setCookie)
  if (session.state === 'forbidden') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (session.state === 'unavailable') return NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 })
  return { cookie: session.setCookie?.split(';', 1)[0] ?? `SESSIONID=${sessionId}`, setCookie: session.setCookie }
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
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'GET',
        headers: getSpringBackendHeaders()
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact detail', error)
      return NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      )
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return NextResponse.json(errorJson, { status: springResponse.status })
      } catch {
        const errorBody = await springResponse.text()
        return NextResponse.json(
          { error: errorBody || 'Error al obtener contacto' },
          { status: springResponse.status }
        )
      }
    }

    const contact = await springResponse.json()
    return NextResponse.json(
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
    )
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
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const body = await request.json()
    const bodyValidation = updateContactStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { status } = bodyValidation.data

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders(),
          Cookie: sessionCookie.cookie
        },
        body: JSON.stringify({ status })
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact status update', error)
      return NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      )
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return NextResponse.json(errorJson, { status: springResponse.status })
      } catch {
        const errorBody = await springResponse.text()
        return NextResponse.json(
          { error: errorBody || 'Error al actualizar contacto' },
          { status: springResponse.status }
        )
      }
    }

    const contact = await springResponse.json()

    return relayCookie(NextResponse.json(
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
    ), authorizedSetCookie)
  } catch (error) {
    logger.error('Error al actualizar contacto', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}

// DELETE /api/contacts/[id] - Eliminar contacto
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  let authorizedSetCookie: string | undefined
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const sessionCookie = await getAuthorizedSessionCookie(request)
    if (sessionCookie instanceof NextResponse) return sessionCookie
    authorizedSetCookie = sessionCookie.setCookie

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts/${id}`, {
        method: 'DELETE',
        headers: { ...getSpringBackendHeaders(), Cookie: sessionCookie.cookie }
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact delete', error)
      return NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      )
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return NextResponse.json(errorJson, { status: springResponse.status })
      } catch {
        const errorBody = await springResponse.text()
        return NextResponse.json(
          { error: errorBody || 'Error al eliminar contacto' },
          { status: springResponse.status }
        )
      }
    }

    return relayCookie(NextResponse.json({ message: 'Contacto eliminado' }), authorizedSetCookie)
  } catch (error) {
    logger.error('Error al eliminar contacto', error)
    return relayCookie(NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    ), authorizedSetCookie)
  }
}
