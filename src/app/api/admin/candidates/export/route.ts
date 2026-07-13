import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { buildCandidateSummaries } from '@/lib/candidates'
import { ExportCandidatesUseCase } from '@/application/exports/ExportCandidatesUseCase'
import { getBackendUrl, getSpringBackendHeaders } from '@/lib/server/springBackend'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
        method: 'GET',
        headers: getSpringBackendHeaders()
      })
    } catch (error) {
      logger.error('Spring backend unreachable for candidate export', error)
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
          { error: errorBody || 'Error al exportar candidatos' },
          { status: springResponse.status }
        )
      }
    }

    const applications = await springResponse.json()
    const search = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || ''

    const candidateSummaries = buildCandidateSummaries(
      applications.map((application: Record<string, unknown>) => {
        const candidate = application.candidate as Record<string, unknown> | null
        const vacancy = application.vacancy as Record<string, unknown> | null
        return {
          id: application.id as string,
          candidateId: application.candidateId as string,
          candidateName: candidate
            ? [candidate.name, candidate.lastName].filter(Boolean).join(' ').trim()
            : '',
          email: (candidate?.email as string) ?? '',
          phone: (candidate?.phone as string) ?? '',
          resumeUrl: (candidate?.resumeUrl as string) ?? undefined,
          resumeFileName: (candidate?.resumeFileName as string) ?? undefined,
          coverLetter: (application.coverLetter as string) ?? undefined,
          status: application.status as string,
          submittedAt: (application.submittedAt as string) ?? new Date().toISOString(),
          vacancy: vacancy
            ? { id: vacancy.id as string, title: vacancy.title as string, location: (vacancy.location as string) ?? '' }
            : undefined
        }
      })
    ).filter((candidate) => {
      if (!search) return true
      return [candidate.candidateName, candidate.email, candidate.phone]
        .some((value) => value.toLowerCase().includes(search))
    })

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

    return new NextResponse(exportFile.content, {
      status: 200,
      headers: {
        'Content-Type': exportFile.mimeType,
        'Content-Disposition': `attachment; filename="${exportFile.fileName}"`
      }
    })
  } catch (error) {
    logger.error('Error al exportar candidatos', error)
    return NextResponse.json({ error: 'Error al exportar candidatos' }, { status: 500 })
  }
}
