import { ExportFile, type ExportColumn } from '@/domain/export/ExportFile'

const CSV_SEPARATOR = ';'

function escapeCsvValue(value: string): string {
  const normalized = value.replace(/"/g, '""')
  if (/[;"\r\n]/.test(normalized)) {
    return `"${normalized}"`
  }
  return normalized
}

export class CsvExporter {
  export<T>(fileName: string, rows: T[], columns: ExportColumn<T>[]) {
    const header = columns.map((column) => column.header).join(CSV_SEPARATOR)
    const lines = [header]

    for (const row of rows) {
      lines.push(
        columns
          .map((column) => escapeCsvValue(column.value(row)))
          .join(CSV_SEPARATOR)
      )
    }

    return new ExportFile(
      fileName,
      'text/csv; charset=utf-8',
      `\uFEFF${lines.join('\n')}`
    )
  }
}
