import { describe, expect, it } from 'vitest'
import { buildApplicationsCsv } from '@/lib/csv/applicationsExport'

describe('applicationsExport', () => {
  it('genera CSV con columnas pedidas, BOM y separador ;', () => {
    const csv = buildApplicationsCsv([
      {
        candidateName: 'Ana Pérez',
        email: 'ana@empresa.com',
        phone: '+54 9 351 1234-5678',
        vacancyTitle: 'Analista "Data"',
        submittedAt: new Date('2026-03-04T10:00:00.000Z')
      }
    ])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Nombre y Apellido;Email;Teléfono;Puesto;Fecha')
    expect(csv).toContain('"Analista ""Data"""')
    expect(csv).toContain('04/03/2026')
  })
})
