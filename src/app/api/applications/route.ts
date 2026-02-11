import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApplicationStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { sendNewApplicationEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import {
  applicationsListQuerySchema,
  createApplicationSchema,
  formatValidationError
} from '@/lib/apiValidation'


// GET /api/applications - Listar todas las aplicaciones (admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
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
    const { vacancyId, status: statusParam } = queryValidation.data

    const where: { vacancyId?: string; status?: ApplicationStatus } = {}
    if (vacancyId) where.vacancyId = vacancyId
    if (statusParam) where.status = statusParam

    const applications = await prisma.application.findMany({
      where,
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json(applications)
  } catch (error) {
    logger.error('Error al obtener aplicaciones', error)
    return NextResponse.json(
      { error: 'Error al obtener aplicaciones' },
      { status: 500 }
    )
  }
}

// POST /api/applications - Enviar postulación
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
      coverLetter
    } = bodyValidation.data

    // Verificar que la vacante existe y está activa
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId }
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: 'Vacante no encontrada' },
        { status: 404 }
      )
    }

    if (vacancy.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Esta vacante ya no está activa' },
        { status: 400 }
      )
    }

    // Crear aplicación
    const application = await prisma.application.create({
      data: {
        vacancyId,
        candidateName,
        email,
        phone,
        resumeUrl,
        resumeFileName,
        resumeKey,
        coverLetter,
        status: 'PENDING'
      }
    })

    // Enviar notificación al admin (no bloqueante)
    sendNewApplicationEmail({
      vacancyTitle: vacancy.title,
      applicantName: candidateName,
      applicantEmail: email,
      applicantPhone: phone,
      message: coverLetter
    }).catch(error => {
      logger.error('Error al enviar email de notificación', error, {
        vacancyTitle: vacancy.title,
        applicationEmail: email
      })
    })

    return NextResponse.json(
      { 
        message: 'Postulación enviada exitosamente',
        applicationId: application.id 
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error al crear aplicación', error)
    return NextResponse.json(
      { error: 'Error al enviar postulación' },
      { status: 500 }
    )
  }
}
