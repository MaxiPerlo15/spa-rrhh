import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ContactStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { sendNewContactEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import {
  contactsListQuerySchema,
  createContactSchema,
  formatValidationError
} from '@/lib/apiValidation'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { verifyTurnstileToken } from '@/lib/botProtection'
import { toContactAdminDto } from '@/lib/dto/contact'

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
    const queryValidation = contactsListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined
    })
    if (!queryValidation.success) {
      return NextResponse.json(formatValidationError(queryValidation.error), { status: 400 })
    }
    const { status: statusParam } = queryValidation.data

    const where: { status?: ContactStatus } = {}
    if (statusParam) where.status = statusParam

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(contacts.map(toContactAdminDto))
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
    const bodyValidation = createContactSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }
    const { name, email, phone, subject, message, captchaToken } = bodyValidation.data

    const clientIp = getClientIp(request.headers)
    const rateLimitResult = await rateLimit({
      key: `contacts:${clientIp}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 5
    })
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit bloqueó un contacto', {
        ip: clientIp,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds
      })
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta nuevamente en ${rateLimitResult.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const captchaVerification = await verifyTurnstileToken({
      token: captchaToken,
      remoteIp: clientIp,
      action: 'contact_form'
    })
    if (!captchaVerification.success) {
      logger.warn('Captcha inválido al crear contacto', {
        ip: clientIp,
        reason: captchaVerification.reason
      })
      return NextResponse.json(
        { error: 'No se pudo verificar el captcha' },
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
