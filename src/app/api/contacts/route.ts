import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  contactsListQuerySchema,
  createContactSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { toContactAdminDto } from '@/lib/dto/contact'
import { guardPublicRequest, isPublicRequestGuardError } from '@/lib/publicRequestGuard'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import { authorizeDashboardRead, relaySpringCookies } from '@/lib/server/adminBffBoundary'

// GET /api/contacts - Listar contactos (admin)
export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeDashboardRead(request)
    if (authorization.state !== 'authorized') {
      return relaySpringCookies(
        NextResponse.json(
          { error: authorization.state === 'unavailable' ? 'Spring backend unavailable' : 'No autorizado' },
          { status: authorization.status }
        ),
        authorization.responseCookies
      )
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return relaySpringCookies(
        NextResponse.json({ error: 'Spring backend not configured' }, { status: 503 }),
        authorization.responseCookies
      )
    }

    const searchParams = request.nextUrl.searchParams
    const queryValidation = contactsListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined
    })
    if (!queryValidation.success) {
      return relaySpringCookies(
        NextResponse.json(formatValidationError(queryValidation.error), { status: 400 }),
        authorization.responseCookies
      )
    }

    let springResponse: Response
    try {
        springResponse = await fetch(`${backendUrl}/api/v1/contacts`, {
          method: 'GET',
          headers: {
            ...getSpringBackendHeaders(),
            ...(authorization.cookie ? { Cookie: authorization.cookie } : {})
          }
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact list', error)
      return relaySpringCookies(
        NextResponse.json({ error: 'Spring backend unavailable' }, { status: 503 }),
        authorization.responseCookies
      )
    }

    if (!springResponse.ok) {
      try {
        const errorJson = await springResponse.json()
        return relaySpringCookies(
          relaySpringCookies(NextResponse.json(errorJson, { status: springResponse.status }), authorization.responseCookies),
          springResponse.headers
        )
      } catch {
        const errorBody = await springResponse.text()
        return relaySpringCookies(
          relaySpringCookies(NextResponse.json({ error: errorBody || 'Error al obtener contactos' }, { status: springResponse.status }), authorization.responseCookies),
          springResponse.headers
        )
      }
    }

    const contacts = await springResponse.json()

    const response = NextResponse.json(
      contacts.map((c: Record<string, unknown>) =>
        toContactAdminDto({
          id: c.id as string,
          name: c.name as string,
          email: c.email as string,
          phone: c.phone as string,
          subject: c.subject as string,
          message: c.message as string,
          status: c.status as string,
          createdAt: c.createdAt as string
        })
      )
    )
    relaySpringCookies(response, authorization.responseCookies)
    return relaySpringCookies(response, springResponse.headers)
  } catch (error) {
    logger.error('Error al obtener contactos', error)
    return NextResponse.json(
      { error: 'Error al obtener contactos' },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Enviar mensaje de contacto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bodyValidation = createContactSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { name, email, phone, subject, message, captchaToken } = bodyValidation.data

    try {
      await guardPublicRequest({
        headers: request.headers,
        captchaToken,
        captchaAction: 'contact_form',
        rateLimitKey: 'contacts',
        maxRequests: 5,
        rateLimitLog: {
          kind: 'warn',
          message: 'Rate limit bloqueó un contacto'
        },
        captchaLog: {
          kind: 'warn',
          message: 'Captcha inválido al crear contacto'
        }
      })
    } catch (error) {
      if (!isPublicRequestGuardError(error)) throw error
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
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
      springResponse = await fetch(`${backendUrl}/api/v1/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders()
        },
        body: JSON.stringify({ name, email, phone, subject, message })
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact submit', error)
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
          { error: errorBody || 'Error al enviar mensaje' },
          { status: springResponse.status }
        )
      }
    }

    const responseBody = await springResponse.json()
    return NextResponse.json(responseBody, { status: springResponse.status })
  } catch (error) {
    logger.error('Error al crear contacto', error)
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 }
    )
  }
}
