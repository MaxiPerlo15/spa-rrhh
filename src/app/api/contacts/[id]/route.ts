import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/contacts/[id] - Obtener un contacto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const contact = await prisma.contact.findUnique({
      where: { id: params.id }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error al obtener contacto:', error)
    return NextResponse.json(
      { error: 'Error al obtener contacto' },
      { status: 500 }
    )
  }
}

// PATCH /api/contacts/[id] - Actualizar estado del contacto
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    // Validar estado
    const validStatuses = ['PENDING', 'RESPONDED', 'ARCHIVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: { status }
    })

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error al actualizar contacto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id] - Eliminar contacto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    await prisma.contact.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Contacto eliminado' })
  } catch (error) {
    console.error('Error al eliminar contacto:', error)
    return NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    )
  }
}
