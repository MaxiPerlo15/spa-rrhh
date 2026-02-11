import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  formatValidationError,
  routeIdSchema,
  updateContactStatusSchema
} from '@/lib/apiValidation'
import { toContactAdminDto } from '@/lib/dto/contact'
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/contacts/[id] - Obtener un contacto
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const contact = await prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true
      }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contacto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(toContactAdminDto(contact))
  } catch (error) {
    logger.error('Error al obtener contacto', error)
    return NextResponse.json(
      { error: 'Error al obtener contacto' },
      { status: 500 }
    )
  }
}

// PATCH /api/contacts/[id] - Actualizar estado del contacto
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const bodyValidation = updateContactStatusSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { status } = bodyValidation.data

    const contact = await prisma.contact.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true
      }
    })

    return NextResponse.json(toContactAdminDto(contact))
  } catch (error) {
    logger.error('Error al actualizar contacto', error)
    return NextResponse.json(
      { error: 'Error al actualizar contacto' },
      { status: 500 }
    )
  }
}

// DELETE /api/contacts/[id] - Eliminar contacto
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const parsedParams = routeIdSchema.safeParse(await params)
    if (!parsedParams.success) {
      return NextResponse.json(formatValidationError(parsedParams.error), { status: 400 })
    }
    const { id } = parsedParams.data
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    await prisma.contact.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Contacto eliminado' })
  } catch (error) {
    logger.error('Error al eliminar contacto', error)
    return NextResponse.json(
      { error: 'Error al eliminar contacto' },
      { status: 500 }
    )
  }
}
