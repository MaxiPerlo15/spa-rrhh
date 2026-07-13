import { CandidateExportRow } from '@/domain/candidate/CandidateExportRow'
import type { ExportColumn } from '@/domain/export/ExportFile'
import { CsvExporter } from '@/infrastructure/export/CsvExporter'

type CandidateExportSource = {
  candidateName: string
  email: string
  phone: string
  resumeFileName?: string
  resumeUrl?: string
  latestStatus: 'PENDING' | 'REVIEWING' | 'INTERVIEWED' | 'ACCEPTED' | 'REJECTED'
  latestSubmittedAt: string
  latestVacancyTitle: string
  applicationsCount: number
}

const candidateColumns: ExportColumn<CandidateExportRow>[] = [
  { header: 'Nombre y Apellido', value: (row) => row.candidateName },
  { header: 'Email', value: (row) => row.email },
  { header: 'Teléfono', value: (row) => row.phone },
  { header: 'CV', value: (row) => row.resume },
  { header: 'Último estado', value: (row) => row.latestStatus },
  { header: 'Última postulación', value: (row) => row.latestSubmittedAt },
  { header: 'Última vacante', value: (row) => row.latestVacancyTitle },
  { header: 'Cantidad de postulaciones', value: (row) => row.applicationsCount }
]

export class ExportCandidatesUseCase {
  constructor(private readonly exporter = new CsvExporter()) {}

  execute(candidates: CandidateExportSource[]) {
    const rows = candidates.map((candidate) => CandidateExportRow.from(candidate))
    const fileDate = new Date().toISOString().slice(0, 10)
    return this.exporter.export(`candidatos-${fileDate}.csv`, rows, candidateColumns)
  }
}
