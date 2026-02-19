import type { AdminNotification } from '@prisma/client'

export interface AdminNotificationDto {
  id: string
  title: string
  message: string
  level: 'info' | 'success' | 'warning'
  isRead: boolean
  createdAt: string
}

export function toAdminNotificationDto(notification: AdminNotification): AdminNotificationDto {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    level: notification.level.toLowerCase() as AdminNotificationDto['level'],
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString()
  }
}
