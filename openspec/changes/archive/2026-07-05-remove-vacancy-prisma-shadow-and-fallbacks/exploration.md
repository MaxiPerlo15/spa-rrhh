## Exploration: Remove Vacancy Prisma Shadow and Fallbacks

### Current State

The vacancy domain is the only domain currently split between Spring and Next.js. Spring owns the vacancy lifecycle via `/api/v1/vacancies/**`, but Next.js retains Prisma as a fallback/shadow layer in four distinct patterns:

1. **Fallback reads on Spring failure** (`canUsePrismaFallbackForSpringReads`): When `BACKEND_URL` is set but Spring returns an error (network, timeout, or 5xx), and `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR=true` in non-production, the code silently falls back to `prisma.vacancy.*` queries. This affects vacancy listing, public vacancy listing, application submission validation, and application metadata enrichment.

2. **Prisma as primary when `BACKEND_URL` is unset**: If `BACKEND_URL` is not configured, every vacancy route goes directly to Prisma with no Spring involvement at all. This is the "local dev fallback" behavior.

3. **Local vacancy shadow writes** (`ensureSpringVacancyExistsLocally`): During application submission, after validating a vacancy against Spring, the code upserts a Prisma `vacancy` record as a local shadow. This creates a dual-write seam — Spring is the source of truth but Next also writes vacancy rows to maintain referential integrity with Prisma-managed applications.

4. **Metadata enrichment via hybrid path** (`applicationVacancyMetadata.ts`): When listing applications or viewing application details, vacancy metadata (title, location) is fetched from Spring first, with a Prisma fallback if Spring fails. This is consumed by `GET /api/applications` and `GET /api/applications/[id]`.

### Affected Areas

- `src/lib/server/springBackend.ts` — defines `canUsePrismaFallbackForSpringReads()` and `normalizeSpringVacancyStatus()`; the fallback gate function is deleted entirely
- `src/lib/server/applicationVacancyMetadata.ts` — entire file is hybrid Spring/Prisma for vacancy metadata; must become Spring-only or be eliminated
- `src/lib/server/publicVacancies.ts` — `listPublicVacancyDtos()` falls back to `prisma.vacancy.findMany()` on Spring failure
- `src/app/api/vacancies/route.ts` — GET falls back to Prisma when Spring fails or is absent; POST falls back to `prisma.vacancy.create()` when `BACKEND_URL` is unset
- `src/app/api/vacancies/[id]/route.ts` — GET falls back to Prisma when Spring absent; update/delete fall back to Prisma when Spring absent; Prisma used for previous-state lookup in update flow
- `src/app/api/applications/route.ts` — `ensureSpringVacancyExistsLocally()` upserts Prisma vacancy shadow; `getVacancyForApplicationSubmission()` falls back to Prisma on Spring failure
- `src/app/api/applications/[id]/route.ts` — consumes `getApplicationVacancyMetadata()` (hybrid path) for GET and PATCH responses
- `src/lib/__tests__/vacancyRoute.test.ts` — tests Prisma fallback paths
- `src/lib/__tests__/vacancyDetailRoute.test.ts` — tests Prisma fallback paths
- `src/lib/__tests__/applicationsRoute.test.ts` — tests fallback on Spring failure during application submission
- `src/lib/__tests__/applicationsListRoute.test.ts` — tests fallback on Spring timeout during application listing metadata enrichment

### Approaches

1. **Hard fail on missing Spring (remove all fallbacks, require BACKEND_URL)** — Remove every Prisma fallback path in vacancy reads/writes. If `BACKEND_URL` is not set or Spring is unreachable, the route returns an error instead of silently falling back to Prisma. Remove `ensureSpringVacancyExistsLocally` entirely. Remove `canUsePrismaFallbackForSpringReads` and the `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR` env var.
   - Pros: Cleanest target state; no dual-write; no split source of truth; simplest code path
   - Cons: Breaks local dev without a running Spring instance; requires running Spring for any vacancy testing
   - Effort: Medium

2. **Graceful degradation — return 503 on Spring failure (no Prisma fallback, but clear error)** — Same as approach 1 but replace silent Prisma fallback with a clear 503 error when Spring is unavailable. Keep `BACKEND_URL` as required in production, but allow a helpful error message in dev.
   - Pros: No silent data divergence; clear operational signal; still safe for production
   - Cons: Still breaks local dev without Spring; slightly more code for error responses than approach 1
   - Effort: Medium

3. **Staged removal — first remove fallbacks, then require BACKEND_URL** — Phase A: remove `canUsePrismaFallbackForSpringReads` and `ensureSpringVacancyExistsLocally`, make Spring-only paths fail loudly. Phase B (separate PR): make `BACKEND_URL` required, remove Prisma vacancy model usage entirely.
   - Pros: Smaller PRs; easier to review; can validate Spring-only paths before tightening env requirements
   - Cons: Two PRs instead of one; temporary intermediate state still has Prisma model references
   - Effort: Medium (two slices)

### Recommendation

**Approach 3 (staged removal)** — but scope this exploration to Phase A only, which is what the roadmap calls `remove-vacancy-prisma-shadow-and-fallbacks`.

Phase A scope:
- Delete `canUsePrismaFallbackForSpringReads` from `springBackend.ts`
- Remove `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR` from env checks and docs
- Remove the Prisma fallback branches in `vacancies/route.ts` GET, `vacancies/[id]/route.ts` GET/PUT/PATCH/DELETE, `publicVacancies.ts`, `applications/route.ts` submission validation
- Remove `ensureSpringVacancyExistsLocally` and its call in `applications/route.ts`
- Simplify `applicationVacancyMetadata.ts` to Spring-only (no Prisma fallback)
- When `BACKEND_URL` is not set, routes should return 500/503 with a clear message instead of silently using Prisma
- Update all affected unit tests

Phase B (separate change `simplify-spring-vacancy-contract`): remove duplicate types, normalizeSpringVacancyStatus if Spring owns status, and eventually the Prisma vacancy model entirely.

### Risks

- **Local dev without Spring**: Developers who currently rely on `BACKEND_URL` unset + Prisma for local dev will need to run Spring locally. Mitigate by documenting the required local setup.
- **Application submission still depends on local vacancy persistence**: `Application.vacancyId` is still modeled against `Vacancy.id` in Prisma. Removing `ensureSpringVacancyExistsLocally` is the right architectural move, but the proposal must explicitly decide whether this slice also loosens that relation or whether it is sequenced with the Prisma-removal follow-up. Otherwise application writes can break at the persistence layer.
- **Test coverage gap**: The existing tests explicitly cover fallback behavior. Removing fallbacks requires deleting or rewriting those test cases — not just removing code paths.
- **400-line budget risk**: Medium. The changes touch ~6 files with moderate deletions and some additions (error responses). Estimated ~200-300 changed lines, within budget but close.

### Ready for Proposal

Yes — the scope is clear and well-bounded. The orchestrator should tell the user: "Exploration is complete. The change removes all Prisma fallback/shadow behavior from vacancy routes and application vacancy validation. It touches ~6 source files and ~4 test files. The main trade-off is that local dev without a running Spring instance will no longer work for vacancy operations. Ready to proceed to proposal."
