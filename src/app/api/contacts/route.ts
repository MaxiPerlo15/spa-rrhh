import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ContactStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { sendNewContactEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

// GET /api/contacts - Listar contactos (admin)
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
    const statusParam = searchParams.get('status')

    const where: { status?: ContactStatus } = {}
    if (statusParam) where.status = statusParam as ContactStatus

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(contacts)
  } catch (error) {
    logger.error('Error al obtener contactos', error)
    return NextResponse.json(
      { error: 'Error al obtener contactos' },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Enviar mensaje de contacto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    // Validaciones
    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Crear contacto
    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: 'PENDING'
      }
    })

    // Enviar notificación al admin (no bloqueante)
    sendNewContactEmail({
      name,
      email,
      phone,
      company: subject,
      message
    }).catch(error => {
      logger.error('Error al enviar email de notificación', error)
      // No fallar la request si el email falla
    })

    return NextResponse.json(
      { 
        message: 'Mensaje enviado exitosamente',
        contactId: contact.id 
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error al crear contacto', error)
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 }
    )
  }
}
