import type { AdminNotification } from '@prisma/client'

export interface AdminNotificationDto {
  id: string
  title: string
  message: string
  level: 'info' | 'success' | 'warning'
  isRead: boolean
  action?: {
    label: string
    type: 'VACANCY' | 'APPLICATION' | 'CONTACT'
    resourceId: string
  }
  createdAt: string
}

export type AdminNotificationDtoSource = Pick<
  AdminNotification,
  'id' | 'title' | 'message' | 'level' | 'isRead' | 'createdAt'
> & {
  actionLabel?: string | null
  actionType?: 'VACANCY' | 'APPLICATION' | 'CONTACT' | null
  actionResourceId?: string | null
}

export function toAdminNotificationDto(notification: AdminNotificationDtoSource): AdminNotificationDto {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    level: notification.level.toLowerCase() as AdminNotificationDto['level'],
    isRead: notification.isRead,
    action:
      notification.actionLabel && notification.actionType && notification.actionResourceId
        ? {
            label: notification.actionLabel,
            type: notification.actionType,
            resourceId: notification.actionResourceId
          }
        : undefined,
    createdAt: notification.createdAt.toISOString()
  }
}
