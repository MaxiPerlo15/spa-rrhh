# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Slice | Changed lines | Risk | Work-unit rollback |
|---|---:|---|---|
| 1 Foundation | 360–400 | High | Revert bridge/Flyway additions |
| 2 Admin ownership | 360–400 | High | Revert adapters/catalog |
| 3 Operations | 330–390 | High | Revert jobs/forwarding |
| 4 Contract evidence | 320–380 | High | Revert adapters; retain data |
| 5 Decommission | 900–1,300 | High | Restore archive and revert |
| **Total** | **2,270–2,870** | **High** | **Five work units** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| PR | Commit | Start → finish |
|---|---|---|
| 1 | `feat(auth): bridge Spring sessions and reconcile settings` | Security/Flyway tests → evidence baseline |
| 2 | `feat(admin): move admin operations to Spring` | Contracts → admin adapters/catalog |
| 3 | `feat(retention): move retention and policy decisions` | Worker tests → Spring jobs/forwarding |
| 4 | `feat(adapters): complete Spring contract migration` | Parity tests → all migration smoke gates |
| 5 | `chore(orm): remove Prisma behind verification gate` | Archive/verifier tests → removal |

Choose Feature Branch Chain or stacked PRs before apply; tests travel with each commit. PR 5 needs a maintainer `size:exception`, or an approved archive/gate sub-PR before removal.

## Slice 1: Foundation — Expand

- [ ] 1.1 **RED** Add cases in `backend/src/test/java/com/meinardi/rrhh/{infrastructure/SecurityConfigTest.java,infrastructure/SecurityConfigApplicationRoutesTest.java,application/SessionServiceTest.java,presentation/AuthControllerTest.java}` for `admin:access`, stale sessions, 401/403 JSON, and cleanup; run `mvn test` in `backend/`.
- [ ] 1.2 **GREEN/REFACTOR** Add `SessionAuthenticationFilter`; revise `SecurityConfig.java`, `SessionService.java`, `AuthController.java`, `UsuarioRepository.java`, and `application.yml` for fingerprint authority revalidation; run `mvn test`.
- [ ] 1.3 **RED→GREEN** Test then add immutable reconciliation evidence/services and `backend/src/main/resources/db/migration/V1__*.sql`/`V2__*.sql`; reject drift/unverified mappings. Update `src/lib/{springSession.ts,proxy.ts}` plus `springSession.test.ts`; run `mvn test` and `npm run test:unit`.

## Slice 2: Admin Ownership — Expand

- [ ] 2.1 **RED** Add MockMvc/Vitest contracts for notification, audit, settings, and health DTOs, pagination/dates, 401/403/503, and no-store; run `mvn test` and `npm run test:unit`.
- [ ] 2.2 **GREEN** Add `backend/src/main/java/com/meinardi/rrhh/presentation/AdminOperationsController.java`, services/repositories/DTOs, and atomic audit catalog; convert `src/app/api/admin/{notifications,notifications/[id],audit,settings}/route.ts` and `src/app/api/health/route.ts` to forwarding adapters; run both suites.
- [ ] 2.3 **REFACTOR** Remove local schema-drift branches only after parity passes; commit/revert this adapter/catalog unit independently.

## Slice 3: Operations — Expand

- [ ] 3.1 **RED** Add Spring tests for classified audit purge, CV dry-run/lease/retry/supersede, and public-policy denial; run `mvn test`.
- [ ] 3.2 **GREEN/REFACTOR** Add `backend/src/main/java/com/meinardi/rrhh/application/RetentionService.java`, leased schedulers, storage gateway, and policy endpoint; forward `src/app/api/internal/{audit-retention,cv-retention}/route.ts` and `src/app/api/uploadthing/route.ts`, then run both suites.
- [ ] 3.3 Remove `src/lib/{auditRetention,cvRetention,auditRetentionPolicy}.ts` only after parity; rollback jobs/forwarders independently.

## Slice 4: Contract Evidence — Contract

- [ ] 4.1 **RED** Extend MockMvc/Vitest tests for all 29 audit outcomes, CSRF/origin, export bytes/headers, validation, and no fallback; run both suites.
- [ ] 4.2 **GREEN/REFACTOR** Move `auditAdminAction()` call sites into Spring transactions/advice; adapt `applications/[id]`, `applications/export`, `admin/candidates{,/[id],/export}`, `vacancies{,/[id]}`, and `contacts/[id]`; run `mvn test` and `npm run test:unit`.
- [ ] 4.3 Record approved reconciliation checksum and execute admin/policy/export/health smoke fixtures; retain legacy data on failure.

## Slice 5: Prisma Decommission — Contract

- [ ] 5.1 **RED** Add `scripts/__tests__/verify-orm-removal.test.mjs` and `scripts/__tests__/fixtures/{ci-orm-removal.yml,ci-missing-orm-removal.yml}` for mixed-case content, path residue, exclusions, malformed manifests/locks, forbidden packages, and CI-job predicates; run `npm run test:unit`.
- [ ] 5.2 **GREEN** Archive `prisma/**` to `docs/archive/prisma/**`; add `scripts/verify-orm-removal.mjs` and `package.json` `verify:orm-removal` using NUL `git ls-files` and fail-closed scans; run `npm run verify:orm-removal`.
- [ ] 5.3 Add `.github/workflows/ci.yml` `orm-removal` job fixture, exact command, `ci-success.needs`/predicate, and workflow fixture; run `npm run test:unit`.
- [ ] 5.4 After approval, remove Prisma code/packages/CI steps; run `npm ci`, `npm run verify:orm-removal`, `npm run test:unit`, and `mvn test`; restore archive/revert on failure.
