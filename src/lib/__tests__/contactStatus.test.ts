import { describe, expect, it } from 'vitest'
import { buildContactStatusChangeSummary, contactStatusLabels } from '@/lib/contactStatus'

describe('contactStatus helpers', () => {
  it('expone etiquetas legibles para cada estado', () => {
    expect(contactStatusLabels).toMatchObject({
      PENDING: 'Pendiente',
      RESPONDED: 'Respondido',
      ARCHIVED: 'Archivado'
    })
  })

  it('construye un resumen de confirmación con nombre, asunto y cambio de estado', () => {
    const message = buildContactStatusChangeSummary(
      {
        name: 'Laura Gomez',
        email: 'laura@empresa.com',
        subject: 'Consulta comercial',
        status: 'PENDING'
      },
      'RESPONDED'
    )

    expect(message).toContain('Contacto: "Laura Gomez"')
    expect(message).toContain('Email: "laura@empresa.com"')
    expect(message).toContain('Asunto: "Consulta comercial"')
    expect(message).toContain('Estado actual: Pendiente')
    expect(message).toContain('Nuevo estado: Respondido')
    expect(message).toContain('¿Deseas confirmar la gestión del contacto?')
  })
})
