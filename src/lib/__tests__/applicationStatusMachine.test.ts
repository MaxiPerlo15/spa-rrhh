import { describe, expect, it } from 'vitest'
import { ApplicationStatusMachine } from '@/domain/application/ApplicationStatusMachine'

describe('ApplicationStatusMachine', () => {
  it('permite transiciones válidas del flujo de selección', () => {
    expect(ApplicationStatusMachine.startReview('PENDING')).toBe('REVIEWING')
    expect(ApplicationStatusMachine.markInterviewed('REVIEWING')).toBe('INTERVIEWED')
    expect(ApplicationStatusMachine.accept('INTERVIEWED')).toBe('ACCEPTED')
    expect(ApplicationStatusMachine.reject('PENDING')).toBe('REJECTED')
  })

  it('rechaza transiciones inválidas', () => {
    expect(() => ApplicationStatusMachine.accept('PENDING')).toThrow(
      'Transición inválida de postulación: PENDING -> ACCEPTED'
    )
    expect(() => ApplicationStatusMachine.startReview('REJECTED')).toThrow(
      'Transición inválida de postulación: REJECTED -> REVIEWING'
    )
  })
})
