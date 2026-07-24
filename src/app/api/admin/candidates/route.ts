import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { rejectIfUntrustedOrigin } from '@/lib/csrf'
import { createAdminCandidateSchema, formatValidationError } from '@/lib/apiValidation'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const originRejection = rejectIfUntrustedOrigin(request)
    if (originRejection) {
      return originRejection
    }

    const body = await request.json()
    const bodyValidation = createAdminCandidateSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Spring backend not configured' },
        { status: 503 }
      )
    }

    const { candidateName, email, phone, notes } = bodyValidation.data

    let springResponse: Response
    try {
      springResponse = await fetch(`${backendUrl}/api/v1/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders()
        },
        body: JSON.stringify({ candidateName, email, phone, notes })
      })
    } catch (error) {
      logger.error('Spring backend unreachable for candidate create', error)
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
          { error: errorBody || 'Error al registrar candidato manual' },
          { status: springResponse.status }
        )
      }
    }

    const responseBody = await springResponse.json()

    return NextResponse.json(responseBody, { status: springResponse.status })
  } catch (error) {
    logger.error('Error al registrar candidato manual', error)
    return NextResponse.json(
      { error: 'Error al registrar candidato manual' },
      { status: 500 }
    )
  }
}
