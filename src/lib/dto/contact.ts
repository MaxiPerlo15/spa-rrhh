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

type ContactAdminDtoSource = Pick<Contact, 'id' | 'name' | 'email' | 'phone' | 'subject' | 'message' | 'status' | 'createdAt'>

export function toContactAdminDto(contact: ContactAdminDtoSource): ContactAdminDto {
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
