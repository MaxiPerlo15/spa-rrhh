import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { forgotPasswordSchema, formatValidationError } from '@/lib/apiValidation'
import {
  buildPasswordResetLink,
  generateRawResetToken,
  getPasswordResetTokenTtlMinutes,
  getResetTokenExpiryDate,
  hashResetToken
} from '@/lib/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'Si existe una cuenta con ese email, enviamos un enlace para restablecer la contraseña.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation.error), { status: 400 })
    }

    const { email } = validation.data
    const normalizedEmail = email.toLowerCase()

    const clientIp = getClientIp(request.headers)
    const rateLimitResult = await rateLimit({
      key: `forgot-password:${clientIp}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 6
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta nuevamente en ${rateLimitResult.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, role: true }
    })

    // No revelar si el email existe. Solo generar token para usuarios admin.
    if (user?.role === 'ADMIN') {
      const rawToken = generateRawResetToken()
      const tokenHash = hashResetToken(rawToken)
      const expiresAt = getResetTokenExpiryDate()
      const expiresMinutes = getPasswordResetTokenTtlMinutes()

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      })

      await sendPasswordResetEmail({
        toEmail: user.email,
        resetLink: buildPasswordResetLink(rawToken),
        expiresMinutes
      })

      logger.info('Solicitud de reset emitida', { userId: user.id, ip: clientIp })
    } else {
      logger.info('Solicitud de reset ignorada por usuario inexistente/no-admin', { ip: clientIp })
    }

    return NextResponse.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE })
  } catch (error) {
    logger.error('Error al solicitar reset de contraseña', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
