import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/applications/[id] - Obtener una postulación específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        vacancy: {
          select: {
            id: true,
            title: true,
            location: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(application)
  } catch (error) {
    logger.error('Error al obtener postulación', error)
    return NextResponse.json(
      { error: 'Error al obtener postulación' },
      { status: 500 }
    )
  }
}

// PATCH /api/applications/[id] - Actualizar estado de postulación (admin)
export async function PATCH(
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
    const { status } = body

    // Validar estado
    const validStatuses = ['PENDING', 'REVIEWING', 'INTERVIEWED', 'ACCEPTED', 'REJECTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    const application = await prisma.application.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json(application)
  } catch (error) {
    logger.error('Error al actualizar postulación', error)
    return NextResponse.json(
      { error: 'Error al actualizar postulación' },
      { status: 500 }
    )
  }
}

// DELETE /api/applications/[id] - Eliminar postulación (admin)
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

    await prisma.application.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error al eliminar postulación', error)
    return NextResponse.json(
      { error: 'Error al eliminar postulación' },
      { status: 500 }
    )
  }
}
