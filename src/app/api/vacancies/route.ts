import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/vacancies - Listar vacantes activas
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'ACTIVE'

    const vacancies = await prisma.vacancy.findMany({
      where: {
        status: status as 'ACTIVE' | 'CLOSED' | 'DRAFT'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transformar para compatibilidad con el frontend
    const formattedVacancies = vacancies.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      location: v.location,
      type: v.type.toLowerCase().replace('_', '-') as 'full-time' | 'part-time' | 'freelance',
      salary: v.salary || undefined,
      requirements: v.requirements || undefined,
      benefits: v.benefits || undefined
    }))

    return NextResponse.json(formattedVacancies)
  } catch (error) {
    console.error('Error al obtener vacantes:', error)
    return NextResponse.json(
      { error: 'Error al obtener vacantes' },
      { status: 500 }
    )
  }
}

// POST /api/vacancies - Crear nueva vacante (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, location, type, salary, requirements, benefits } = body

    // Validaciones básicas
    if (!title || !description || !location || !type) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Convertir type del frontend al formato de la BD
    const typeMap: Record<string, string> = {
      'full-time': 'FULL_TIME',
      'part-time': 'PART_TIME',
      'freelance': 'FREELANCE'
    }

    const vacancy = await prisma.vacancy.create({
      data: {
        title,
        description,
        location,
        type: typeMap[type] as 'FULL_TIME' | 'PART_TIME' | 'FREELANCE',
        salary,
        requirements,
        benefits,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json(vacancy, { status: 201 })
  } catch (error) {
    console.error('Error al crear vacante:', error)
    return NextResponse.json(
      { error: 'Error al crear vacante' },
      { status: 500 }
    )
  }
}
