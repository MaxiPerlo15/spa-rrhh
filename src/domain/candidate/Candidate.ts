type CandidateProps = {
  id: string
  name: string
  email: string
  phone: string
  resumeUrl?: string
  resumeFileName?: string
}

export class Candidate {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone: string
  readonly resumeUrl?: string
  readonly resumeFileName?: string

  constructor(props: CandidateProps) {
    this.id = props.id
    this.name = props.name
    this.email = props.email
    this.phone = props.phone
    this.resumeUrl = props.resumeUrl
    this.resumeFileName = props.resumeFileName
  }

  hasResume() {
    return Boolean(this.resumeUrl)
  }

  matchesSearch(search: string) {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return (
      this.name.toLowerCase().includes(query) ||
      this.email.toLowerCase().includes(query) ||
      this.phone.toLowerCase().includes(query)
    )
  }

  compareByName(other: Candidate) {
    return this.name.localeCompare(other.name, 'es', { sensitivity: 'base' })
  }
}
