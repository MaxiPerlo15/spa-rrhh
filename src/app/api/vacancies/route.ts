import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { normalizeLocation } from '@/lib/utils'
import {
  createVacancySchema,
  formatValidationError,
  vacanciesListQuerySchema
} from '@/lib/apiValidation'
import { toVacancyDto } from '@/lib/dto/vacancy'


// GET /api/vacancies - Listar vacantes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryValidation = vacanciesListQuerySchema.safeParse({
      all: searchParams.get('all')?.toLowerCase()
    })
    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }
    const { all } = queryValidation.data // Para el admin dashboard
    
    // Solo admins pueden pedir todas las vacantes
    if (all) {
      const session = await auth()
      if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        )
      }
    }

    const vacancies = await prisma.vacancy.findMany({
      where: all ? {} : { status: 'ACTIVE' },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedVacancies = vacancies.map(toVacancyDto)

    return NextResponse.json(formattedVacancies)
  } catch (error) {
    logger.error('Error al obtener vacantes', error)
    return NextResponse.json(
      { error: 'Error al obtener vacantes' },
      { status: 500 }
    )
  }
}

// POST /api/vacancies - Crear nueva vacante (admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const bodyValidation = createVacancySchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { title, description, location, workday, modality, salary, requirements, benefits } = bodyValidation.data

    const vacancy = await prisma.vacancy.create({
      data: {
        title,
        description,
        location: normalizeLocation(location),
        workday,
        modality,
        salary,
        requirements,
        benefits,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json(toVacancyDto(vacancy), { status: 201 })
  } catch (error) {
    logger.error('Error al crear vacante', error)
    return NextResponse.json(
      { error: 'Error al crear vacante' },
      { status: 500 }
    )
  }
}
