import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const { id } = await params
    const body = await request.json()

    // Convertir type si viene del frontend
    if (body.type) {
      const typeMap: Record<string, string> = {
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        'freelance': 'FREELANCE'
      }
      body.type = typeMap[body.type] || body.type
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
