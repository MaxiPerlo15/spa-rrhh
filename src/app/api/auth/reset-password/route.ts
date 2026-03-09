import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { formatValidationError, resetPasswordSchema } from '@/lib/apiValidation'
import { hashResetToken } from '@/lib/passwordReset'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { clearAttemptFailures, getAttemptLock, recordAttemptFailure } from '@/lib/authAttemptGuard'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation.error), { status: 400 })
    }

    const { token, password } = validation.data
    const tokenHash = hashResetToken(token)
    const now = new Date()

    const clientIp = getClientIp(request.headers)
    const identity = `${tokenHash}:${clientIp}`
    const lockState = await getAttemptLock('reset-password', identity)
    if (lockState.blocked) {
      logger.security('auth.reset_password.throttled', {
        ip: clientIp,
        retryAfterSeconds: lockState.retryAfterSeconds
      })
      return NextResponse.json(
        { error: `Temporalmente bloqueado. Intenta nuevamente en ${lockState.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const rateLimitResult = await rateLimit({
      key: `reset-password:${clientIp}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 10
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta nuevamente en ${rateLimitResult.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true
      }
    })

    if (!passwordResetToken || passwordResetToken.usedAt || passwordResetToken.expiresAt < now) {
      const attemptState = await recordAttemptFailure('reset-password', identity)
      logger.security('auth.reset_password.invalid_token', {
        ip: clientIp,
        failures: attemptState.failures,
        blocked: attemptState.blocked
      })
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o expiró' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: passwordResetToken.userId },
        data: { passwordHash }
      })

      await tx.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      })
    })

    logger.info('Contraseña actualizada mediante reset', {
      userId: passwordResetToken.userId,
      ip: clientIp
    })
    await clearAttemptFailures('reset-password', identity)

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente' })
  } catch (error) {
    logger.error('Error al restablecer contraseña', error)
    return NextResponse.json(
      { error: 'Error al restablecer contraseña' },
      { status: 500 }
    )
  }
}
