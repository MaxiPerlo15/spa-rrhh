# Proposal: Remove Vacancy Prisma Shadow and Fallbacks

## Intent

Make Spring the only source of truth for vacancies. Next.js currently keeps Prisma fallback/shadow paths for vacancy reads, writes, application submission, and metadata enrichment. Those paths create silent divergence risk and hide Spring integration failures.

## Scope

### In Scope
- Remove Prisma fallback reads/writes from vacancy GET/POST/PUT/DELETE routes.
- Remove `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR` and `canUsePrismaFallbackForSpringReads`.
- Remove `ensureSpringVacancyExistsLocally` from application submission.
- Make `Application.vacancyId` a plain nullable string by dropping the Prisma FK relation while keeping stored IDs.
- Make missing `BACKEND_URL` return explicit 503 responses for vacancy-dependent paths.
- Rewrite affected unit tests around Spring-only and 503 behavior.

### Out of Scope
- Phase B: removing duplicate vacancy types, `normalizeSpringVacancyStatus`, or Prisma `Vacancy` model entirely.
- Spring API changes or new vacancy behavior.
- Making `BACKEND_URL` a global dev startup requirement.

## Capabilities

> This section is the CONTRACT between proposal and specs phases.
> The sdd-spec agent reads this to know exactly which spec files to create or update.
> Research `openspec/specs/` before filling this in.

### New Capabilities
None — this removes internal fallback behavior.

### Modified Capabilities
None — existing `openspec/specs/` only covers admin auth/session capabilities, not vacancy routing.

## Approach

Use staged removal. Phase A (this change) deletes fallback/shadow execution paths, drops only the `Application.vacancyId` FK coupling, keeps the column for application display, and preserves Spring metadata lookup through `applicationVacancyMetadata.ts`. Phase B follows with pure cleanup: duplicate type removal and eventual Prisma `Vacancy` model deletion.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/server/springBackend.ts` | Modified | Remove fallback helper/env handling |
| `src/app/api/vacancies/**` | Modified | Spring-only vacancy routes; 503 without backend |
| `src/app/api/applications/route.ts` | Modified | Remove local vacancy shadow upsert |
| `src/lib/server/applicationVacancyMetadata.ts` | Modified | Spring-only metadata enrichment |
| `prisma/schema.prisma` + migration | Modified | Drop `Application.vacancyId` FK, keep column |
| `src/lib/__tests__/*vacancy*`, `*applications*` | Modified | Replace fallback assertions with Spring-only/503 coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local dev without Spring sees failures | High | Return clear 503s; document Spring requirement |
| FK migration breaks submissions | Medium | Keep `vacancyId` column; drop only relation constraint |
| Regression in vacancy/admin routes | Medium | Update route tests before implementation is accepted |

## Rollback Plan

Revert the migration and code changes together. The `vacancyId` values remain stored, so restoring the FK and shadow upsert path is a normal git/database rollback with no expected data loss.

## Dependencies

- Prisma migration for dropping the `Application.vacancyId` FK relation.
- Running Spring backend for vacancy-dependent development/tests.

## Success Criteria

- [ ] No `prisma.vacancy.*` use remains in vacancy routes or application submission.
- [ ] Missing `BACKEND_URL` returns 503 instead of Prisma fallback data.
- [ ] `ensureSpringVacancyExistsLocally` no longer exists.
- [ ] `applicationVacancyMetadata.ts` has no Prisma import.
- [ ] `npm run typecheck` and affected unit tests pass.
