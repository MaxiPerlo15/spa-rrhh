export type VacancyStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED' | 'DRAFT'

const vacancyTransitions: Record<VacancyStatus, VacancyStatus[]> = {
  DRAFT: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['INACTIVE', 'CLOSED'],
  INACTIVE: ['ACTIVE', 'CLOSED'],
  CLOSED: []
}

export class VacancyStatusMachine {
  static canTransition(from: VacancyStatus, to: VacancyStatus) {
    return vacancyTransitions[from].includes(to)
  }

  static assertTransition(from: VacancyStatus, to: VacancyStatus) {
    if (from === to) {
      throw new Error(`La vacante ya se encuentra en estado ${to}`)
    }

    if (!this.canTransition(from, to)) {
      throw new Error(`Transición inválida de vacante: ${from} -> ${to}`)
    }
  }

  static activate(from: VacancyStatus) {
    this.assertTransition(from, 'ACTIVE')
    return 'ACTIVE' as const
  }

  static deactivate(from: VacancyStatus) {
    this.assertTransition(from, 'INACTIVE')
    return 'INACTIVE' as const
  }

  static close(from: VacancyStatus) {
    this.assertTransition(from, 'CLOSED')
    return 'CLOSED' as const
  }
}
