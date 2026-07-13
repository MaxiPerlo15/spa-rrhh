import { describe, expect, it } from 'vitest'
import { VacancyStatusMachine } from '@/domain/vacancy/VacancyStatusMachine'

describe('VacancyStatusMachine', () => {
  it('permite activación, desactivación y cierre válidos', () => {
    expect(VacancyStatusMachine.activate('DRAFT')).toBe('ACTIVE')
    expect(VacancyStatusMachine.deactivate('ACTIVE')).toBe('INACTIVE')
    expect(VacancyStatusMachine.activate('INACTIVE')).toBe('ACTIVE')
    expect(VacancyStatusMachine.close('ACTIVE')).toBe('CLOSED')
  })

  it('rechaza transiciones inválidas', () => {
    expect(() => VacancyStatusMachine.activate('CLOSED')).toThrow(
      'Transición inválida de vacante: CLOSED -> ACTIVE'
    )
    expect(() => VacancyStatusMachine.deactivate('DRAFT')).toThrow(
      'Transición inválida de vacante: DRAFT -> INACTIVE'
    )
  })
})
