import { describe, expect, it } from 'vitest'
import { applicationStatusLabels, buildApplicationStatusChangeSummary } from '@/lib/applicationStatus'

describe('applicationStatus helpers', () => {
  it('expone etiquetas legibles para cada estado', () => {
    expect(applicationStatusLabels).toMatchObject({
      PENDING: 'Pendiente',
      REVIEWING: 'En Revisión',
      INTERVIEWED: 'Entrevistado',
      ACCEPTED: 'Aceptado',
      REJECTED: 'Rechazado'
    })
  })

  it('construye un resumen de confirmación con candidato, vacante y cambio de estado', () => {
    const message = buildApplicationStatusChangeSummary(
      {
        candidateName: 'Ana Perez',
        status: 'PENDING',
        vacancy: {
          id: 'vac_1',
          title: 'Analista RRHH'
        }
      },
      'REVIEWING'
    )

    expect(message).toContain('Postulación: "Ana Perez"')
    expect(message).toContain('Vacante: "Analista RRHH"')
    expect(message).toContain('Estado actual: Pendiente')
    expect(message).toContain('Nuevo estado: En Revisión')
    expect(message).toContain('¿Deseas confirmar la actualización?')
  })

  it('usa "Espontánea" cuando la postulación no tiene vacante asociada', () => {
    const message = buildApplicationStatusChangeSummary(
      {
        candidateName: 'Carlos Diaz',
        status: 'REVIEWING',
        vacancy: undefined
      },
      'ACCEPTED'
    )

    expect(message).toContain('Vacante: "Espontánea"')
  })
})
