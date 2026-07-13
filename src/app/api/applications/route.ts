import { NextRequest, NextResponse } from 'next/server'
import type { ApplicationStatus } from '@/domain/application/ApplicationStatusMachine'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  applicationsListQuerySchema,
  createApplicationSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { toApplicationAdminDto } from '@/lib/dto/application'
import { guardPublicRequest, isPublicRequestGuardError } from '@/lib/publicRequestGuard'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

type SpringApplicationListResponse = {
  id: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  status: string
  submittedAt: string
  vacancy: { id: string; title: string; location: string } | null
}

// GET /api/applications - Listar todas las aplicaciones (admin) — Spring-backed
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
    const queryValidation = applicationsListQuerySchema.safeParse({
      vacancyId: searchParams.get('vacancyId') ?? undefined,
      status: searchParams.get('status') ?? undefined
    })
    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }

    const params = new URLSearchParams()
    if (queryValidation.data.vacancyId) params.set('vacancyId', queryValidation.data.vacancyId)
    if (queryValidation.data.status) params.set('status', queryValidation.data.status)

    const queryString = params.toString()
    const url = `${backendUrl}/api/v1/applications${queryString ? `?${queryString}` : ''}`

    let springResponse: Response
    try {
      springResponse = await fetch(url, {
        method: 'GET',
        headers: getSpringBackendHeaders()
      })
    } catch (error) {
      logger.error('Spring backend unreachable for application list', error)
      return NextResponse.json(
        { error: 'Spring backend unavailable' },
        { status: 503 }
      )
    }

    if (!springResponse.ok) {
      let errorBody: string
      try {
        const errorJson = await springResponse.json()
        return NextResponse.json(errorJson, { status: springResponse.status })
      } catch {
        errorBody = await springResponse.text()
      }
      logger.error('Spring backend rejected application list', { status: springResponse.status, body: errorBody })
      return NextResponse.json(
        { error: errorBody || 'Error al obtener aplicaciones' },
        { status: springResponse.status }
      )
    }

    const applications: SpringApplicationListResponse[] = await springResponse.json()

    return NextResponse.json(
      applications.map((app) =>
        toApplicationAdminDto({
          id: app.id,
          candidateId: app.candidateId,
          candidateName: app.candidateName,
          email: app.email,
          phone: app.phone,
          resumeUrl: app.resumeUrl,
          resumeFileName: app.resumeFileName,
          coverLetter: app.coverLetter,
          status: app.status as ApplicationStatus,
          submittedAt: new Date(app.submittedAt),
          vacancy: app.vacancy
            ? { id: app.vacancy.id, title: app.vacancy.title, location: app.vacancy.location }
            : null
        })
      )
    )
  } catch (error) {
    logger.error('Error al obtener aplicaciones', error)
    return NextResponse.json(
      { error: 'Error al obtener aplicaciones' },
      { status: 500 }
    )
  }
}

// POST /api/applications - Enviar postulación — Spring-backed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bodyValidation = createApplicationSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const {
      vacancyId,
      candidateName,
      email,
      phone,
      resumeUrl,
      resumeFileName,
      resumeKey,
      coverLetter,
      captchaToken
    } = bodyValidation.data

    try {
      await guardPublicRequest({
        headers: request.headers,
        captchaToken,
        captchaAction: 'application_form',
        rateLimitKey: 'applications',
        maxRequests: 8,
        rateLimitLog: {
          kind: 'warn',
          message: 'Rate limit bloqueó una postulación'
        },
        captchaLog: {
          kind: 'warn',
          message: 'Captcha inválido al crear postulación'
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
      springResponse = await fetch(`${backendUrl}/api/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSpringBackendHeaders()
        },
        body: JSON.stringify({
          vacancyId: vacancyId ?? null,
          candidateName,
          email,
          phone,
          resumeUrl: resumeUrl ?? null,
          resumeFileName: resumeFileName ?? null,
          resumeKey: resumeKey ?? null,
          coverLetter: coverLetter ?? null
        })
      })
    } catch (error) {
      logger.error('Spring backend unreachable for application submission', error)
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
          { error: errorBody || 'Error al enviar postulación' },
          { status: springResponse.status }
        )
      }
    }

    const responseBody = await springResponse.json()
    return NextResponse.json(responseBody, { status: springResponse.status })
  } catch (error) {
    logger.error('Error al crear aplicación', error)
    return NextResponse.json(
      { error: 'Error al enviar postulación' },
      { status: 500 }
    )
  }
}
