# Design: Remove Vacancy Prisma Shadow and Fallbacks

## Decision

**Approach**: Hard-fail on missing Spring (staged Phase A). All Prisma fallback/shadow paths for vacancies are removed. When `BACKEND_URL` is unset, vacancy-dependent routes return 503. When Spring is unreachable, errors propagate instead of falling back to Prisma. `Application.vacancyId` keeps the column but drops the FK constraint to `Vacancy`.

## Prisma Migration

Drop the FK constraint only — keep `vacancyId` column for application display.

```sql
ALTER TABLE "Application"
DROP CONSTRAINT "Application_vacancyId_fkey";
```

The `vacancyId` column remains `String?` (nullable). The `Vacancy` model and its indexes stay untouched — Phase B handles full model removal. The composite index `@@index([vacancyId, status])` on `Application` remains useful for queries.

Rollback: `ALTER TABLE "Application" ADD CONSTRAINT "Application_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE;`

## Code Changes

### 1. `src/lib/server/springBackend.ts`

- **Delete** `canUsePrismaFallbackForSpringReads()` (lines 22-25).
- Keep `getBackendUrl()`, `getSpringBackendHeaders()`, `normalizeSpringVacancyStatus()`.

### 2. `src/lib/server/applicationVacancyMetadata.ts`

- **Delete** `import { prisma }` and `import { canUsePrismaFallbackForSpringReads }`.
- **Delete** `getLocalVacancyMetadata()` and `shouldUseLocalFallback()`.
- **Simplify** `getApplicationVacancyMetadata()`: when `!getBackendUrl()` return `null` (caller decides). Otherwise call `getSpringVacancyMetadata()` directly — propagate errors, no catch-and-fallback.

### 3. `src/lib/server/publicVacancies.ts`

- **Delete** `import { prisma }` and `import { canUsePrismaFallbackForSpringReads }`.
- **Delete** Prisma fallback block in `listPublicVacancyDtos()` (lines 73-89).
- When `!getBackendUrl()`, throw `Error('BACKEND_URL is required for public vacancies')`.
- When Spring fails, propagate — do not catch.

### 4. `src/app/api/vacancies/route.ts`

- **Delete** `import { prisma }`, `import { canUsePrismaFallbackForSpringReads }`, `import { toVacancyDto }`.
- **Delete** `listVacanciesWithFallback()`.
- **GET**: Call `listVacanciesInSpring(all)` directly. If `!getBackendUrl()`, return 503 `{ error: 'Vacancy backend not configured' }`. If Spring throws, propagate as 500.
- **POST**: Delete Prisma `vacancy.create` fallback (lines 292-323). When `!getBackendUrl()`, return 503. `createVacancyInSpring()` already throws when `!backendUrl` — change its `return null` to throw.

### 5. `src/app/api/vacancies/[id]/route.ts`

- **Delete** `import { prisma }`, `import { Prisma, type VacancyStatus as PrismaVacancyStatus }`.
- **GET**: When `!getBackendUrl()`, return 503. Remove Prisma `findUnique`/`findFirst` fallback (lines 279-312).
- **PUT/PATCH** (`updateVacancy`): Remove Prisma `findUnique` previous-state lookup (lines 400-407). Remove Prisma `vacancy.update` fallback (lines 542-575). When `!getBackendUrl()`, return 503.
- **DELETE**: Remove Prisma `findUnique` + `vacancy.update` fallback (lines 695-748). When `!getBackendUrl()`, return 503.
- All Spring helper functions (`getVacancyFromSpring`, `closeVacancyInSpring`, etc.): change `return null` on missing `backendUrl` to `throw new Error('BACKEND_URL is required')`.

### 6. `src/app/api/applications/route.ts`

- **Delete** `ensureSpringVacancyExistsLocally()` (lines 95-114) and its call in POST (line 328).
- **Delete** `getFallbackVacancyForApplication()`.
- **Delete** `getVacancyForApplicationSubmission()`. Replace inline in POST with a direct Spring call:
  - When `!getBackendUrl()`, return 503.
  - Call `getVacancyFromSpringForApplication()`. If 404 → 404. If error → propagate as 500.
  - Extract `vacancyId`, `title`, `status` from Spring response. No Prisma upsert.
- **Delete** `toPrismaVacancyStatus`, `toPrismaVacancyWorkday`, `toPrismaVacancyModality` helpers.
- **Delete** `import { canUsePrismaFallbackForSpringReads }`.
- **GET** (application list): `getApplicationVacancyMetadata()` is already the enrichment path — it becomes Spring-only after change #2. No additional changes needed here.

### 7. `src/app/api/applications/[id]/route.ts`

- No changes — `getApplicationVacancyMetadata()` is called indirectly and becomes Spring-only via change #2.

## Error Handling

| Scenario | Current | After |
|----------|---------|-------|
| `BACKEND_URL` unset, vacancy GET/POST | Prisma query | **503** `{ error: 'Vacancy backend not configured' }` |
| `BACKEND_URL` set, Spring 5xx/timeout | Prisma fallback (if allowed) | **500/504** propagated from Spring |
| `BACKEND_URL` set, Spring 404 (vacancy) | null/404 | **404** (unchanged) |
| `BACKEND_URL` set, Spring rejects mutation | Error body forwarded | **Error body forwarded** (unchanged) |
| Application submission, Spring down | Prisma fallback + shadow upsert | **503** (application not created) |
| Metadata enrichment, Spring down | Prisma fallback | `null` vacancy metadata (list continues, vacancy title hidden) |

## Test Strategy

### `vacancyRoute.test.ts`
- Keep existing Spring validation test (line 44).
- Add: test that POST without `BACKEND_URL` returns 503.
- Add: test that GET without `BACKEND_URL` returns 503.

### `vacancyDetailRoute.test.ts`
- **Delete** two tests that exercise Prisma fallback without `BACKEND_URL` (lines 62-108: `oculta vacantes no activas` and `permite a admin ver una vacante cerrada`). Replace with 503 tests when `BACKEND_URL` is absent.
- Keep all Spring-forward tests (lines 110-357) — they already test Spring-only paths.
- Add: test that GET/DELETE/PATCH without `BACKEND_URL` return 503.

### `applicationsRoute.test.ts`
- **Delete** `rechaza postulaciones a vacantes no activas` (Prisma-only, lines 85-105).
- **Delete** `crea la postulación asociada a la vacante activa seleccionada` (Prisma-only, lines 131-170).
- **Delete** `usa fallback local permitido si falla la lectura de Spring` (lines 236-270).
- **Rewrite** `crea la postulación para una vacante activa validada contra Spring` to verify no `vacancyUpsert` is called.
- Add: test that POST without `BACKEND_URL` returns 503.
- Add: test that POST when Spring returns 404 returns 404.

### `applicationsListRoute.test.ts`
- **Delete** `usa fallback local cuando Spring demora demasiado y la política lo permite` (lines 318-388).
- **Delete** `no usa fallback local cuando Spring demora demasiado y la política no lo permite` (lines 258-316) — simplify to verify Spring timeout propagates.
- Keep `mantiene la respuesta base si falla una metadata de vacante` (line 135) — still valid (enrichment failure doesn't block list).
- Keep `no usa fallback local cuando Spring responde 404` (line 212) — still valid.
- Keep `no confía en payloads exitosos malformados` (line 390) — still valid.

## Rollback Procedure

1. `git revert` the commit(s) containing this change.
2. Re-run `npx prisma migrate deploy` to re-apply the reverted migration (re-adds FK constraint).
3. The `vacancyId` values were never deleted, so restoring the FK and shadow upsert path restores full functionality with no data loss.
4. Re-set `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR=true` in dev if needed.

## Budget Forecast

| Metric | Value |
|--------|-------|
| Estimated changed lines | ~250-300 (deletions dominate) |
| Decision needed before apply | No |
| Chained PRs recommended | No |
| 400-line budget risk | **Low** |

## CodeGraph Note

CodeGraph was not available (`.codegraph/` missing). All exploration used standard glob/grep/read tools.
