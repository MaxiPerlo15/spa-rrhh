import { ApplicationExportRow } from '@/domain/application/ApplicationExportRow'
import type { ExportColumn } from '@/domain/export/ExportFile'
import { CsvExporter } from '@/infrastructure/export/CsvExporter'

type ApplicationExportSource = {
  candidateName: string
  email: string
  phone: string
  vacancyTitle: string
  submittedAt: Date
}

const applicationColumns: ExportColumn<ApplicationExportRow>[] = [
  { header: 'Nombre y Apellido', value: (row) => row.candidateName },
  { header: 'Email', value: (row) => row.email },
  { header: 'Teléfono', value: (row) => row.phone },
  { header: 'Puesto', value: (row) => row.vacancyTitle },
  { header: 'Fecha', value: (row) => row.submittedAt }
]

export class ExportApplicationsUseCase {
  constructor(private readonly exporter = new CsvExporter()) {}

  execute(applications: ApplicationExportSource[]) {
    const rows = applications.map((application) => ApplicationExportRow.from(application))
    const fileDate = new Date().toISOString().slice(0, 10)
    return this.exporter.export(`postulaciones-${fileDate}.csv`, rows, applicationColumns)
  }
}
