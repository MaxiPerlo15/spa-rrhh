import Pagination from '@/components/Pagination'
import type { CandidateSummary } from '@/lib/candidates'
import { applicationStatusLabels } from '@/lib/applicationStatus'

interface AdminCandidatesSectionProps {
  candidates: CandidateSummary[]
  filteredCandidates: CandidateSummary[]
  paginatedCandidates: CandidateSummary[]
  currentCandidatePage: number
  itemsPerPage: number
  setCurrentCandidatePage: (page: number) => void
  searchCandidates: string
  setSearchCandidates: (value: string) => void
  onOpenCreateCandidate: () => void
  onEditCandidate: (candidate: CandidateSummary) => void
  onExportCsv: () => void
  isExportingCsv: boolean
}

export default function AdminCandidatesSection({
  candidates,
  filteredCandidates,
  paginatedCandidates,
  currentCandidatePage,
  itemsPerPage,
  setCurrentCandidatePage,
  searchCandidates,
  setSearchCandidates,
  onOpenCreateCandidate,
  onEditCandidate,
  onExportCsv,
  isExportingCsv
}: AdminCandidatesSectionProps) {
  return (
    <div className="ds-surface overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-900">Candidatos registrados</h2>
              <p className="text-sm text-gray-600">
                Vista consolidada a partir de postulaciones, CVs y vacantes asociadas.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Total: <span className="font-semibold">{candidates.length}</span>
              </div>
              <button
                type="button"
                onClick={onExportCsv}
                disabled={isExportingCsv || filteredCandidates.length === 0}
                className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition-all duration-200 hover:from-emerald-100 hover:to-emerald-200 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExportingCsv ? 'Exportando...' : 'Exportar CSV'}
              </button>
              <button
                type="button"
                onClick={onOpenCreateCandidate}
                className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
              >
                + Registrar candidato
              </button>
            </div>
          </div>

          <input
            id="admin-candidates-search"
            name="admin_candidates_search"
            type="text"
            autoComplete="off"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchCandidates}
            onChange={(event) => setSearchCandidates(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
      </div>

      <div className="md:hidden space-y-4 p-4">
        {filteredCandidates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            No hay candidatos registrados
          </div>
        ) : (
          paginatedCandidates.map((candidate) => (
            <div key={candidate.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{candidate.candidateName}</h3>
                  <p className="text-xs text-gray-600">{candidate.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {candidate.applications.length} postul.
                </span>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p><span className="font-medium text-gray-700">Teléfono:</span> {candidate.phone}</p>
                <p><span className="font-medium text-gray-700">Último estado:</span> {applicationStatusLabels[candidate.latestStatus]}</p>
                <p><span className="font-medium text-gray-700">CV:</span> {candidate.resumeUrl ? (candidate.resumeFileName ?? 'Disponible') : 'No disponible'}</p>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => onEditCandidate(candidate)}
                  className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Modificar candidato
                </button>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Postulaciones asociadas</p>
                <div className="space-y-2">
                  {candidate.applications.map((application) => (
                    <div key={application.id} className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                      <p className="font-medium">{application.vacancyTitle}</p>
                      <p>{applicationStatusLabels[application.status]} • {new Date(application.submittedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Candidato</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contacto</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">CV</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Último estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Última postulación</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Asociadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No hay candidatos registrados
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-4 py-4 text-sm">
                    <p className="font-medium text-gray-900">{candidate.candidateName}</p>
                    <p className="text-xs text-gray-500">{candidate.applications.length} postulaciones</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <p>{candidate.email}</p>
                    <p className="text-xs text-gray-500">{candidate.phone}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {candidate.resumeUrl ? (candidate.resumeFileName ?? 'Disponible') : 'No disponible'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {applicationStatusLabels[candidate.latestStatus]}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(candidate.latestSubmittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => onEditCandidate(candidate)}
                      className="mb-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Modificar
                    </button>
                    <div className="space-y-1">
                      {candidate.applications.slice(0, 3).map((application) => (
                        <p key={application.id} className="truncate">
                          {application.vacancyTitle} · {applicationStatusLabels[application.status]}
                        </p>
                      ))}
                      {candidate.applications.length > 3 && (
                        <p className="text-xs text-gray-500">+{candidate.applications.length - 3} más</p>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentCandidatePage}
        totalItems={filteredCandidates.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentCandidatePage}
      />
    </div>
  )
}
