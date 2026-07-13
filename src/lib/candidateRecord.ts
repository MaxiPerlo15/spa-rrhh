type CandidateIdentityLike = {
  id: string
  name: string
  lastName: string | null
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  resumeKey?: string | null
}

type ApplicationCandidateLike = {
  candidateId: string
  candidate: CandidateIdentityLike
}

export function getCandidateDisplayName(candidate: Pick<CandidateIdentityLike, 'name' | 'lastName'>) {
  return [candidate.name, candidate.lastName].filter(Boolean).join(' ').trim()
}

export function resolveApplicationCandidate(application: ApplicationCandidateLike) {
  return {
    candidateId: application.candidate.id,
    candidateName: getCandidateDisplayName(application.candidate),
    email: application.candidate.email,
    phone: application.candidate.phone,
    resumeUrl: application.candidate.resumeUrl,
    resumeFileName: application.candidate.resumeFileName,
    resumeKey: application.candidate.resumeKey ?? null
  }
}
