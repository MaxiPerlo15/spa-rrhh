# Tasks: Remove Vacancy Prisma Shadow and Fallbacks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-300 (deletions dominate) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | single-pr |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

## Phase 1: Prisma Schema Migration

- [x] 1.1 Create Prisma migration to `ALTER TABLE "Application" DROP CONSTRAINT "Application_vacancyId_fkey"` — keep column, drop FK only
- [x] 1.2 Update `prisma/schema.prisma`: remove `vacancy` relation from `Application` model, keep `vacancyId String?`
- [x] 1.3 Run `npx prisma migrate dev` and verify migration applies cleanly

## Phase 2: Core Cleanup — Spring Backend & Metadata

- [x] 2.1 `src/lib/server/springBackend.ts`: delete `canUsePrismaFallbackForSpringReads()` function (lines 22-25); keep `getBackendUrl()`, `getSpringBackendHeaders()`, `normalizeSpringVacancyStatus()`
- [x] 2.2 `src/lib/server/applicationVacancyMetadata.ts`: delete `import { prisma }`, delete `getLocalVacancyMetadata()`, delete `shouldUseLocalFallback()`; simplify `getApplicationVacancyMetadata()` to call Spring directly or return null when no `BACKEND_URL`
- [x] 2.3 `src/lib/server/publicVacancies.ts`: delete `import { prisma }`, delete Prisma fallback block in `listPublicVacancyDtos()` (lines 73-89); throw error when `!getBackendUrl()`

## Phase 3: Vacancy Routes — Remove Fallbacks

- [x] 3.1 `src/app/api/vacancies/route.ts`: delete `import { prisma }`, `import { canUsePrismaFallbackForSpringReads }`, `import { toVacancyDto }`; delete `listVacanciesWithFallback()`; GET returns 503 when `!getBackendUrl()`; POST returns 503 when `!getBackendUrl()`; `createVacancyInSpring()` throws instead of returning null
- [x] 3.2 `src/app/api/vacancies/[id]/route.ts`: delete `import { prisma }`, `import { Prisma }`, `import { VacancyStatus as PrismaVacancyStatus }`; GET/PUT/PATCH/DELETE return 503 when `!getBackendUrl()`; delete Prisma `findUnique`/`vacancy.update` fallback blocks in all methods; Spring helpers throw instead of returning null

## Phase 4: Applications Route — Remove Shadow Upsert

- [x] 4.1 `src/app/api/applications/route.ts`: delete `ensureSpringVacancyExistsLocally()` (lines 95-114) and its call in POST (line 328); delete `getFallbackVacancyForApplication()`; delete `getVacancyForApplicationSubmission()`; delete `toPrismaVacancyStatus`, `toPrismaVacancyWorkday`, `toPrismaVacancyModality` helpers; delete `import { canUsePrismaFallbackForSpringReads }`
- [x] 4.2 Inline Spring-only vacancy validation in POST: 503 when `!getBackendUrl()`; call `getVacancyFromSpringForApplication()` directly; 404 if Spring 404; propagate 500 on Spring error

## Phase 5: Test Rewrites (TDD — RED/GREEN/REFACTOR)

- [x] 5.1 `vacancyRoute.test.ts`: add RED tests for POST/GET without `BACKEND_URL` → 503; GREEN by making routes return 503
- [x] 5.2 `vacancyDetailRoute.test.ts`: delete two Prisma fallback tests (lines 62-108); add RED tests for GET/DELETE/PATCH without `BACKEND_URL` → 503; GREEN; keep Spring-forward tests (lines 110-357)
- [x] 5.3 `applicationsRoute.test.ts`: delete Prisma-only tests (lines 85-105, 131-170, 236-270); rewrite Spring validation test to verify no `vacancyUpsert` call; add RED test for POST without `BACKEND_URL` → 503 and Spring 404 → 404
- [x] 5.4 `applicationsListRoute.test.ts`: delete fallback timeout tests (lines 258-388); keep enrichment failure and Spring 404 tests (lines 135, 212, 390)
- [x] 5.5 Run `npm run test:unit` — all tests green; run `npm run typecheck` — no type errors

## Phase 6: Verification

- [x] 6.1 Run `npm run lint` — no lint errors
- [x] 6.2 Run `npm run test:coverage` — thresholds met
- [x] 6.3 Verify success criteria: no `prisma.vacancy.*` in vacancy routes or application submission; `ensureSpringVacancyExistsLocally` gone; `applicationVacancyMetadata.ts` has no Prisma import
