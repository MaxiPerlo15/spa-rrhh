import type { Application } from '@/lib/api/applications'

export const applicationStatusLabels: Record<Application['status'], string> = {
  PENDING: 'Pendiente',
  REVIEWING: 'En Revisión',
  INTERVIEWED: 'Entrevistado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado'
}

export function buildApplicationStatusChangeSummary(
  application: Pick<Application, 'candidateName' | 'status' | 'vacancy'>,
  newStatus: Application['status']
) {
  return [
    `Postulación: "${application.candidateName}"`,
    `Vacante: "${application.vacancy?.title ?? 'Espontánea'}"`,
    `Estado actual: ${applicationStatusLabels[application.status]}`,
    `Nuevo estado: ${applicationStatusLabels[newStatus]}`,
    '',
    '¿Deseas confirmar la actualización?'
  ].join('\n')
}
