export type ApplicationStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'INTERVIEWED'
  | 'ACCEPTED'
  | 'REJECTED'

const applicationTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  PENDING: ['REVIEWING', 'REJECTED'],
  REVIEWING: ['INTERVIEWED', 'REJECTED'],
  INTERVIEWED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: []
}

export class ApplicationStatusMachine {
  static canTransition(from: ApplicationStatus, to: ApplicationStatus) {
    return applicationTransitions[from].includes(to)
  }

  static assertTransition(from: ApplicationStatus, to: ApplicationStatus) {
    if (from === to) {
      throw new Error(`La postulación ya se encuentra en estado ${to}`)
    }

    if (!this.canTransition(from, to)) {
      throw new Error(`Transición inválida de postulación: ${from} -> ${to}`)
    }
  }

  static startReview(from: ApplicationStatus) {
    this.assertTransition(from, 'REVIEWING')
    return 'REVIEWING' as const
  }

  static markInterviewed(from: ApplicationStatus) {
    this.assertTransition(from, 'INTERVIEWED')
    return 'INTERVIEWED' as const
  }

  static accept(from: ApplicationStatus) {
    this.assertTransition(from, 'ACCEPTED')
    return 'ACCEPTED' as const
  }

  static reject(from: ApplicationStatus) {
    this.assertTransition(from, 'REJECTED')
    return 'REJECTED' as const
  }
}
