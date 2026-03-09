type ApplicationCsvRow = {
  candidateName: string
  email: string
  phone: string
  vacancyTitle: string
  submittedAt: Date
}

const CSV_SEPARATOR = ';'
const CSV_HEADER = ['Nombre y Apellido', 'Email', 'Teléfono', 'Puesto', 'Fecha']

function formatDateForCsv(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function escapeCsvValue(value: string): string {
  const normalized = value.replace(/"/g, '""')
  if (/[;"\r\n]/.test(normalized)) {
    return `"${normalized}"`
  }
  return normalized
}

export function buildApplicationsCsv(rows: ApplicationCsvRow[]): string {
  const lines = [CSV_HEADER.join(CSV_SEPARATOR)]

  for (const row of rows) {
    lines.push(
      [
        row.candidateName,
        row.email,
        row.phone,
        row.vacancyTitle,
        formatDateForCsv(row.submittedAt)
      ]
        .map((field) => escapeCsvValue(field ?? ''))
        .join(CSV_SEPARATOR)
    )
  }

  return `\uFEFF${lines.join('\n')}`
}
