export type ContactStatus = 'PENDING' | 'RESPONDED' | 'ARCHIVED'

export type ContactAdminDto = {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: ContactStatus
  createdAt: string
}

type ContactAdminDtoSource = {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: ContactStatus | string
  createdAt: Date | string
}

export function toContactAdminDto(contact: ContactAdminDtoSource): ContactAdminDto {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    subject: contact.subject,
    message: contact.message,
    status: contact.status as ContactStatus,
    createdAt: contact.createdAt instanceof Date
      ? contact.createdAt.toISOString()
      : contact.createdAt
  }
}
