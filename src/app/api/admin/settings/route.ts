import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatValidationError, updateAdminSettingsSchema } from '@/lib/apiValidation'
import { logger } from '@/lib/logger'

function toAdminSettingsResponse(input: {
  user: { id: string; email: string; name: string | null; role: string }
  settings: {
    notificationsEnabled: boolean
    notifyNewApplications: boolean
    notifyNewContacts: boolean
    notifySecurityAlerts: boolean
    updatedAt: Date
  }
}) {
  return {
    profile: {
      id: input.user.id,
      email: input.user.email,
      name: input.user.name ?? '',
      role: input.user.role
    },
    preferences: {
      notificationsEnabled: input.settings.notificationsEnabled,
      notifyNewApplications: input.settings.notifyNewApplications,
      notifyNewContacts: input.settings.notifyNewContacts,
      notifySecurityAlerts: input.settings.notifySecurityAlerts
    },
    updatedAt: input.settings.updatedAt.toISOString()
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const settings = await prisma.adminSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: {
        notificationsEnabled: true,
        notifyNewApplications: true,
        notifyNewContacts: true,
        notifySecurityAlerts: true,
        updatedAt: true
      }
    })

    return NextResponse.json(toAdminSettingsResponse({ user, settings }))
  } catch (error) {
    logger.error('Error al obtener configuración admin', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const bodyValidation = updateAdminSettingsSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(formatValidationError(bodyValidation.error), { status: 400 })
    }

    const { name, notificationsEnabled, notifyNewApplications, notifyNewContacts, notifySecurityAlerts } =
      bodyValidation.data

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.user!.id },
        data: {
          ...(name !== undefined ? { name } : {})
        },
        select: { id: true, email: true, name: true, role: true }
      })

      const settings = await tx.adminSettings.upsert({
        where: { userId: user.id },
        update: {
          ...(notificationsEnabled !== undefined ? { notificationsEnabled } : {}),
          ...(notifyNewApplications !== undefined ? { notifyNewApplications } : {}),
          ...(notifyNewContacts !== undefined ? { notifyNewContacts } : {}),
          ...(notifySecurityAlerts !== undefined ? { notifySecurityAlerts } : {})
        },
        create: {
          userId: user.id,
          notificationsEnabled: notificationsEnabled ?? true,
          notifyNewApplications: notifyNewApplications ?? true,
          notifyNewContacts: notifyNewContacts ?? true,
          notifySecurityAlerts: notifySecurityAlerts ?? true
        },
        select: {
          notificationsEnabled: true,
          notifyNewApplications: true,
          notifyNewContacts: true,
          notifySecurityAlerts: true,
          updatedAt: true
        }
      })

      return { user, settings }
    })

    return NextResponse.json(toAdminSettingsResponse(result))
  } catch (error) {
    logger.error('Error al actualizar configuración admin', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
