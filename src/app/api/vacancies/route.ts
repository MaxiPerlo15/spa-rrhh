import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Función helper para normalizar ubicaciones
function normalizeLocation(location: string): string {
  return location
    .trim() // Eliminar espacios al inicio y final
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .replace(/\s*,\s*/g, ', ') // Normalizar espacios alrededor de comas
}

// GET /api/vacancies - Listar vacantes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const all = searchParams.get('all') // Para el admin dashboard
    
    let whereClause = {}
    
    // Si no es petición de admin, solo mostrar activas
    if (!all) {
      whereClause = { status: 'ACTIVE' }
    }

    const vacancies = await prisma.vacancy.findMany({
      where: whereClause,
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
      workday: v.workday,
      modality: v.modality,
      salary: v.salary || undefined,
      requirements: v.requirements || undefined,
      benefits: v.benefits || undefined,
      status: v.status.toLowerCase(),
      createdAt: v.createdAt.toISOString()
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
    // Verificar autenticación
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, location, workday, modality, salary, requirements, benefits } = body

    // Validaciones básicas
    if (!title || !description || !location || !workday || !modality) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const vacancy = await prisma.vacancy.create({
      data: {
        title: title.trim(),
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

    return NextResponse.json(vacancy, { status: 201 })
  } catch (error) {
    console.error('Error al crear vacante:', error)
    return NextResponse.json(
      { error: 'Error al crear vacante' },
      { status: 500 }
    )
  }
}
