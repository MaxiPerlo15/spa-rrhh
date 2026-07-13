export type ContactStatus = 'PENDING' | 'RESPONDED' | 'ARCHIVED'

const contactTransitions: Record<ContactStatus, ContactStatus[]> = {
  PENDING: ['RESPONDED', 'ARCHIVED'],
  RESPONDED: ['ARCHIVED'],
  ARCHIVED: []
}

export class ContactStatusMachine {
  static canTransition(from: ContactStatus, to: ContactStatus) {
    return contactTransitions[from].includes(to)
  }

  static assertTransition(from: ContactStatus, to: ContactStatus) {
    if (from === to) {
      throw new Error(`El contacto ya se encuentra en estado ${to}`)
    }

    if (!this.canTransition(from, to)) {
      throw new Error(`Transición inválida de contacto: ${from} -> ${to}`)
    }
  }

  static respond(from: ContactStatus) {
    this.assertTransition(from, 'RESPONDED')
    return 'RESPONDED' as const
  }

  static archive(from: ContactStatus) {
    this.assertTransition(from, 'ARCHIVED')
    return 'ARCHIVED' as const
  }
}
