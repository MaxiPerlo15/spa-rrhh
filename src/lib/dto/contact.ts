import type { Contact } from '@prisma/client'

export type ContactAdminDto = {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: Contact['status']
  createdAt: string
}

export function toContactAdminDto(contact: Contact): ContactAdminDto {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    subject: contact.subject,
    message: contact.message,
    status: contact.status,
    createdAt: contact.createdAt.toISOString()
  }
}
