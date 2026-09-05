import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { buildCandidateSummaries } from '@/lib/candidates'
import { ExportCandidatesUseCase } from '@/application/exports/ExportCandidatesUseCase'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'
import {
  authorizeDashboardRead,
  relaySpringCookies,
  type SpringCookieSource
} from '@/lib/server/adminBffBoundary'
import type { Application } from '@/lib/api/applications'

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeDashboardRead(request)
    if (authorization.state !== 'authorized') {
      return json(
        { error: authorization.state === 'unavailable' ? 'Spring backend unavailable' : 'No autorizado' },
        authorization.status,
        authorization.responseCookies
      )
    }

    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return json({ error: 'Spring backend not configured' }, 503, authorization.responseCookies)
    }

    try {
      const search = request.nextUrl.searchParams.get('search')
      const query = search === null ? '' : `?search=${encodeURIComponent(search)}`
      const springResponse = await fetch(`${backendUrl}/api/v1/applications${query}`, {
        cache: 'no-store',
        headers: {
          ...getSpringBackendHeaders(),
          Cookie: authorization.cookie
        }
      })

      if (!springResponse.ok) {
        const errorResponse = await springErrorResponse(springResponse)
        return relaySpringCookies(
          relaySpringCookies(errorResponse, authorization.responseCookies),
          springResponse.headers
        )
      }

      const applications = await springResponse.json() as Record<string, unknown>[]

      const candidateSummaries = buildCandidateSummaries(
        applications.map((application) => {
          const candidate = application.candidate as Record<string, unknown> | null
          const vacancy = application.vacancy as Record<string, unknown> | null
          const source = candidate ?? application
          const candidateName = application.candidateName as string
            ?? [source.name, source.lastName].filter(Boolean).join(' ').trim()

          return {
            id: application.id as string,
            candidateId: application.candidateId as string,
            candidateName,
            email: (application.email as string) ?? (source.email as string) ?? '',
            phone: (application.phone as string) ?? (source.phone as string) ?? '',
            resumeUrl: (application.resumeUrl as string) ?? (source.resumeUrl as string) ?? undefined,
            resumeFileName: (application.resumeFileName as string) ?? (source.resumeFileName as string) ?? undefined,
            coverLetter: (application.coverLetter as string) ?? undefined,
            status: application.status as Application['status'],
            submittedAt: (application.submittedAt as string) ?? new Date().toISOString(),
            vacancy: vacancy
              ? { id: vacancy.id as string, title: vacancy.title as string }
              : undefined
          } satisfies Application
        })
      )

      const exportFile = new ExportCandidatesUseCase().execute(
        candidateSummaries.map((candidate) => ({
          candidateName: candidate.candidateName,
          email: candidate.email,
          phone: candidate.phone,
          resumeFileName: candidate.resumeFileName,
          resumeUrl: candidate.resumeUrl,
          latestStatus: candidate.latestStatus,
          latestSubmittedAt: candidate.latestSubmittedAt,
          latestVacancyTitle: candidate.applications[0]?.vacancyTitle ?? 'Espontánea',
          applicationsCount: candidate.applications.length
        }))
      )

      return relaySpringCookies(
        relaySpringCookies(new NextResponse(exportFile.content, {
          status: 200,
          headers: {
            'Content-Type': exportFile.mimeType,
            'Content-Disposition': `attachment; filename="${exportFile.fileName}"`
          }
        }), authorization.responseCookies),
        springResponse.headers
      )
    } catch (error) {
      logger.error('Spring backend unreachable for candidate export', error)
      return json({ error: 'Spring backend unavailable' }, 503, authorization.responseCookies)
    }
  } catch (error) {
    logger.error('Error al exportar candidatos', error)
    return NextResponse.json({ error: 'Error al exportar candidatos' }, { status: 500 })
  }
}

async function springErrorResponse(response: Response) {
  const errorBody = await response.text()
  try {
    return NextResponse.json(JSON.parse(errorBody), { status: response.status })
  } catch {
    return NextResponse.json(
      { error: errorBody || 'Error al exportar candidatos' },
      { status: response.status }
    )
  }
}

function json(body: unknown, status: 401 | 403 | 503, cookies?: SpringCookieSource) {
  return relaySpringCookies(NextResponse.json(body, { status }), cookies)
}
