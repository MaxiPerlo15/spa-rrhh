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

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/vacancies/[id] - Obtener una vacante específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    const vacancy = await prisma.vacancy.findUnique({
      where: { id },
      include: {
        applications: {
          select: {
            id: true,
            candidateName: true,
            status: true,
            submittedAt: true
          }
        }
      }
    })

    if (!vacancy) {
      return NextResponse.json(
        { error: 'Vacante no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(vacancy)
  } catch (error) {
    console.error('Error al obtener vacante:', error)
    return NextResponse.json(
      { error: 'Error al obtener vacante' },
      { status: 500 }
    )
  }
}

// PUT /api/vacancies/[id] - Actualizar vacante (admin)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Convertir status si viene del frontend
    if (body.status) {
      const statusMap: Record<string, string> = {
        'active': 'ACTIVE',
        'closed': 'CLOSED',
        'draft': 'DRAFT'
      }
      body.status = statusMap[body.status] || body.status.toUpperCase()
    }

    // Normalizar ubicación si viene en el body
    if (body.location) {
      body.location = normalizeLocation(body.location)
    }

    // Normalizar título si viene en el body
    if (body.title) {
      body.title = body.title.trim()
    }

    const vacancy = await prisma.vacancy.update({
      where: { id },
      data: body
    })

    return NextResponse.json(vacancy)
  } catch (error) {
    console.error('Error al actualizar vacante:', error)
    return NextResponse.json(
      { error: 'Error al actualizar vacante' },
      { status: 500 }
    )
  }
}

// DELETE /api/vacancies/[id] - Eliminar vacante (admin)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticación
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    
    await prisma.vacancy.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Vacante eliminada exitosamente' })
  } catch (error) {
    console.error('Error al eliminar vacante:', error)
    return NextResponse.json(
      { error: 'Error al eliminar vacante' },
      { status: 500 }
    )
  }
}
