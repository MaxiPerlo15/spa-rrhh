# Apply Progress: Move Admin Operations and Remove Prisma — PR1c-c Immutable Evidence Foundation

## Delivery

- Strategy: feature-branch-chain.
- Work unit: PR1c-c — immutable reconciliation evidence foundation.
- Boundary: `PR1c-b → PR1c-c`; classification/decisions, approval decisions, backfill, constraints/cutover, Next/admin/retention, and Prisma remain excluded.
- Review budget: 345 changed lines including compatibility-test/task/progress artifacts; within the 400-line limit.
- Rollback: revert V2, evidence models/repositories, evidence tests, and version-two Flyway expectations as one unit.

## Completed Tasks

- [x] PR1a 1.1 RED: session/authorization cases (previous batch)
- [x] PR1a 1.2a GREEN→REFACTOR: permission-authoritative session bridge (previous batch)
- [x] PR1a-fix 1.2b RED→GREEN: configured cookie clearing and logout response propagation (previous batch)
- [x] PR1b 1.3 RED→GREEN→REFACTOR: typed `authorized|anonymous|forbidden|unavailable` Spring BFF/proxy states.
- [x] 2.1 PR1c-a RED→GREEN: V1 empty-PostgreSQL baseline, catalog/history/checksum assertions, and Hibernate validation proof.
- [x] 2.2 PR1c-b RED→GREEN: approved existing-catalog fingerprint, explicit V1 baseline, fail-closed drift rejection, and production Flyway/Hibernate adoption settings.
- [x] 2.3 PR1c-c RED→GREEN→REFACTOR: V2 append-only run/item/approval evidence with complete canonical snapshots, source IDs, SHA-256 bindings, catalog fingerprint, and UPDATE/DELETE/TRUNCATE rejection.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Unit | ✅ 23/23 focused tests before corrective coverage | ✅ Original task RED was recorded in prior apply-progress; corrective tests cover already-green production behavior, so they passed immediately without production edits | ✅ 25/25 focused tests; 433/433 full suite | ✅ Authorized browser pass-through and 502 unavailable add distinct paths to the existing anonymous/403/unavailable coverage | ➖ None needed — test-only corrective retry |
| 2.1 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayEmptyDatabaseIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 2/2 focused, 203/203 full Maven | ✅ V1 catalog/history/checksum and validation | ➖ None needed |
| 2.2 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayAdoptionIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 3/3 focused, 203/203 full Maven | ✅ Adoption, drift rejection, and catalog preservation | ➖ None needed |
| 2.3 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/ReconciliationEvidencePersistenceTest.java` | PostgreSQL integration | ✅ 3/3 focused before corrective retry | ✅ Test-first retry failed at compilation because canonical factory/getters did not exist | ✅ 3/3 focused on PostgreSQL 16; 203/203 full Maven | ✅ Exact canonical bytes, independently derived SHA-256 binding, incomplete/malformed rejection, and UPDATE/DELETE/TRUNCATE paths | ✅ TEXT snapshots preserve canonical bytes; pgcrypto constraints bind every snapshot to its SHA-256 hash |

## Verification

- RED: `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` — corrective canonical-snapshot test failed to compile because `fromSnapshots` and hash/snapshot getters did not exist.
- Focused: `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` — 3/3 passed on PostgreSQL 16 Testcontainers, including real `TRUNCATE` rejection.
- Compatibility: `cd backend && mvn test -Dtest=FlywayEmptyDatabaseIntegrationTest,FlywayAdoptionIntegrationTest,ReconciliationEvidencePersistenceTest` — 8/8 passed.
- Full: `cd backend && mvn test` — 203 tests passed after the corrective retry.
- `git diff --check` — passed.

## Status

PR1c-c is complete. Tasks 2.4–2.5 and later phases remain pending. No commit or push was performed.
