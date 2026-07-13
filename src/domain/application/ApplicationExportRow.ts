type ApplicationExportRowSource = {
  candidateName: string
  email: string
  phone: string
  vacancyTitle: string
  submittedAt: Date
}

function formatDateForCsv(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export class ApplicationExportRow {
  constructor(
    readonly candidateName: string,
    readonly email: string,
    readonly phone: string,
    readonly vacancyTitle: string,
    readonly submittedAt: string
  ) {}

  static from(source: ApplicationExportRowSource) {
    return new ApplicationExportRow(
      source.candidateName,
      source.email,
      source.phone,
      source.vacancyTitle,
      formatDateForCsv(source.submittedAt)
    )
  }
}
