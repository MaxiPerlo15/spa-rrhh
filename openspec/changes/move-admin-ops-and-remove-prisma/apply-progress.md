# Apply Progress: Move Admin Operations and Remove Prisma — PR1c-e Verified Backfill and Contract Gate

## Delivery

- Strategy: feature-branch-chain.
- Work unit: PR1c-e — verified AdminSettings backfill and contract gate.
- Boundary: `PR1c-d → PR1c-e`; legacy drops, Next/admin adapters, retention, and Prisma removal remain excluded.
- Review budget: approximately 390 changed lines including forward V4/V5 migrations, authoritative run-checksum evidence, PostgreSQL integration coverage, compatibility assertions, and planning artifacts; within the 400-line limit.
- Rollback: revert V4/V5 and their PostgreSQL integration coverage as one unit; immutable evidence remains intact.

## Completed Tasks

- [x] PR1a 1.1 RED: session/authorization cases (previous batch)
- [x] PR1a 1.2a GREEN→REFACTOR: permission-authoritative session bridge (previous batch)
- [x] PR1a-fix 1.2b RED→GREEN: configured cookie clearing and logout response propagation (previous batch)
- [x] PR1b 1.3 RED→GREEN→REFACTOR: typed `authorized|anonymous|forbidden|unavailable` Spring BFF/proxy states.
- [x] 2.1 PR1c-a RED→GREEN: V1 empty-PostgreSQL baseline, catalog/history/checksum assertions, and Hibernate validation proof.
- [x] 2.2 PR1c-b RED→GREEN: approved existing-catalog fingerprint, explicit V1 baseline, fail-closed drift rejection, and production Flyway/Hibernate adoption settings.
- [x] 2.3 PR1c-c RED→GREEN→REFACTOR: V2 append-only run/item/approval evidence with complete canonical snapshots, source IDs, SHA-256 bindings, catalog fingerprint, and UPDATE/DELETE/TRUNCATE rejection.
- [x] 2.4 PR1c-d RED→GREEN→REFACTOR: reconciliation approvals reject aliases, validate complete match evidence, and persist immutable checksum-bound product resets.
- [x] 2.5 PR1c-e RED→GREEN→REFACTOR: forward V4 adds run checksum state and derives immutable compatible checksums from valid V3 approval evidence without mutating append-only runs; V5 backfills approved MATCHED/reset settings, blocks unresolved or checksum-divergent evidence, and enforces target unique/not-null/FK constraints.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Unit | ✅ 23/23 focused tests before corrective coverage | ✅ Original task RED was recorded in prior apply-progress; corrective tests cover already-green production behavior, so they passed immediately without production edits | ✅ 25/25 focused tests; 433/433 full suite | ✅ Authorized browser pass-through and 502 unavailable add distinct paths to the existing anonymous/403/unavailable coverage | ➖ None needed — test-only corrective retry |
| 2.1 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayEmptyDatabaseIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 2/2 focused, 203/203 full Maven | ✅ V1 catalog/history/checksum and validation | ➖ None needed |
| 2.2 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayAdoptionIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 3/3 focused, 203/203 full Maven | ✅ Adoption, drift rejection, and catalog preservation | ➖ None needed |
| 2.3 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/ReconciliationEvidencePersistenceTest.java` | PostgreSQL integration | ✅ 3/3 focused before corrective retry | ✅ Test-first retry failed at compilation because canonical factory/getters did not exist | ✅ 3/3 focused on PostgreSQL 16; 203/203 full Maven | ✅ Exact canonical bytes, independently derived SHA-256 binding, incomplete/malformed rejection, and UPDATE/DELETE/TRUNCATE paths | ✅ TEXT snapshots preserve canonical bytes; pgcrypto constraints bind every snapshot to its SHA-256 hash |
| 2.4 | `backend/src/test/java/com/meinardi/rrhh/{application/AdminSettingsReconciliationServiceTest,infrastructure/ReconciliationEvidencePersistenceTest}.java` | Unit + PostgreSQL integration | ✅ 9/9 existing focused tests before this retry | ✅ New factory/getter assertions failed to compile before the durable binding API existed | ✅ 10/10 service+persistence, 15/15 focused PostgreSQL with Flyway, 210/210 full Maven | ✅ Missing MATCHED email and missing RESET_APPROVED product fields reject at PostgreSQL; complete MATCHED and RESET_APPROVED rows persist | ✅ V3 status-dependent check constraint and factory mappings keep each status explicit |
| 2.5 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/ReconciliationBackfillIntegrationTest.java` | PostgreSQL integration | ✅ 8/8 focused before this correction | ✅ A real V3 fixture with valid immutable evidence failed V5 because `reconciliation_runs.report_checksum` was NULL | ✅ 10/10 focused PostgreSQL; 220/220 full Maven | ✅ Valid V3→V5 succeeds from derived approval checksum while conflicting V3 approval checksums block; previous MATCHED/reset/drift and UNIQUE `23505` cases remain | ✅ V2/V3 remain untouched; V4 inserts an append-only derived-checksum table and V5 prefers it only when the run column is NULL |

## Verification

- RED: `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` — corrective canonical-snapshot test failed to compile because `fromSnapshots` and hash/snapshot getters did not exist.
- Focused: `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` — 3/3 passed on PostgreSQL 16 Testcontainers, including real `TRUNCATE` rejection.
- Compatibility: `cd backend && mvn test -Dtest=FlywayEmptyDatabaseIntegrationTest,FlywayAdoptionIntegrationTest,ReconciliationEvidencePersistenceTest` — 8/8 passed.
- Full: `cd backend && mvn test` — 203 tests passed after the corrective retry.
- RED: `cd backend && mvn test -Dtest=AdminSettingsReconciliationServiceTest,ReconciliationEvidencePersistenceTest` — failed before durable approval fields/factory existed.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=AdminSettingsReconciliationServiceTest,ReconciliationEvidencePersistenceTest,FlywayEmptyDatabaseIntegrationTest,FlywayAdoptionIntegrationTest` — 14/14 passed on PostgreSQL 16 Testcontainers.
- Full: `cd backend && mvn test` — 209 tests passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` — failed to compile because `verifiedMatch`, `getUsuarioHash`, and `getPrismaUserId` did not exist.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=AdminSettingsReconciliationServiceTest,ReconciliationEvidencePersistenceTest,FlywayEmptyDatabaseIntegrationTest,FlywayAdoptionIntegrationTest` — 15/15 passed on PostgreSQL 16 Testcontainers.
- Full Maven: `cd backend && mvn test` — 210/210 passed.
- `git diff --check` — passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — 2 failed assertions and a missing `usuarioId` column before V4 existed.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — 3/3 passed on PostgreSQL 16 Testcontainers.
- Full Maven: `cd backend && mvn test` — 213/213 passed.
- `git diff --check` — passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — approved reset values were hardcoded and live evidence drift migrated.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — 5/5 passed on PostgreSQL 16 Testcontainers.
- Full Maven: `cd backend && mvn test` — 215/215 passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — failed because `reconciliation_runs.report_checksum` did not exist.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — 7/7 passed.
- Full Maven: `cd backend && mvn test` — 217/217 passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` — simulated V3 schema failed V4 because `run.report_checksum` was absent; duplicate target fixture returned FK SQLSTATE `23503`.
- Focused PostgreSQL: `cd backend && mvn clean test -Dtest=ReconciliationBackfillIntegrationTest` — 8/8 passed after V2 restoration, forward V4 checksum schema, V5 backfill, and referenced duplicate `23505` assertion.
- Full Maven: `cd backend && mvn test` — 218/218 passed.
- RED: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest#upgradesValidVersionThreeEvidenceWithoutMutatingTheAppendOnlyRun` — valid V3 immutable evidence failed V5 because the added run column was NULL.
- Focused PostgreSQL: `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest,ReconciliationEvidencePersistenceTest` — 15/15 passed; proves V3→V5 success, conflicting V3 checksums block, and existing append-only trigger behavior remains.
- Full Maven: `cd backend && mvn test` — 220/220 passed.

## Status

PR1c-e is complete. V2 and V3 remain immutable for existing databases; forward V4 adds the nullable authoritative `reconciliation_runs.report_checksum` schema and inserts a separate append-only derived checksum for V3 runs only when all bound approvals agree. V5 uses that compatible derived value only when the run column is NULL, while retaining its live-hash, reset-default, target, unique/not-null/FK, and conflicting-checksum gates. The duplicate fixture uses an existing `usuario` target and asserts PostgreSQL UNIQUE SQLSTATE `23505`. Task 3.1 and later phases remain pending. No commit or push was performed.
