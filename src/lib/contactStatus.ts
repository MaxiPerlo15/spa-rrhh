import type { Contact } from '@/lib/api/contacts'

export const contactStatusLabels: Record<Contact['status'], string> = {
  PENDING: 'Pendiente',
  RESPONDED: 'Respondido',
  ARCHIVED: 'Archivado'
}

export function buildContactStatusChangeSummary(
  contact: Pick<Contact, 'name' | 'email' | 'subject' | 'status'>,
  newStatus: Contact['status']
) {
  return [
    `Contacto: "${contact.name}"`,
    `Email: "${contact.email}"`,
    `Asunto: "${contact.subject}"`,
    `Estado actual: ${contactStatusLabels[contact.status]}`,
    `Nuevo estado: ${contactStatusLabels[newStatus]}`,
    '',
    '¿Deseas confirmar la gestión del contacto?'
  ].join('\n')
}
