import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  contactsListQuerySchema,
  createContactSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { toContactAdminDto } from '@/lib/dto/contact'
import { guardPublicRequest, isPublicRequestGuardError } from '@/lib/publicRequestGuard'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

// GET /api/contacts - Listar contactos (admin)
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const queryValidation = contactsListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined
    })
    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/contacts`, {
        method: 'GET',
        headers: getSpringBackendHeaders()
      })
    } catch (error) {
      logger.error('Spring backend unreachable for contact list', error)
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
          { error: errorBody || 'Error al obtener contactos' },
          { status: springResponse.status }
        )
      }
    }

    const contacts = await springResponse.json()

    return NextResponse.json(
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
