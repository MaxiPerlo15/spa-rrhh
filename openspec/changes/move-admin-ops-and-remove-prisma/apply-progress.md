# Apply Progress: Move Admin Operations and Remove Prisma — PR2a-fix Same-Origin Spring Auth Relay

## Delivery

- Strategy: feature-branch-chain.
- Work unit: PR2a-fix — same-origin Spring login/logout relay.
- Boundary: `PR2a → PR2a-fix`; notifications, audit, settings, retention, and Prisma removal remain excluded.
- Review budget: 128 changed lines including route/UI relay code, Vitest contracts, Playwright coverage, and planning artifacts; within the 400-line limit.
- Rollback: revert the relay routes, signin/dashboard relay calls, and focused relay tests as one unit.

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
- [x] 3.1 PR2a RED→GREEN→REFACTOR: Spring owns a `SELECT 1` readiness check at `/api/v1/health`; the Next adapter delegates without Prisma fallback and preserves 200/503 `{status,database}` plus `Cache-Control: no-store`.
- [x] 3.2 PR2a-fix RED: same-origin login/logout contracts cover Spring status mapping, cookie forwarding, logout request-cookie forwarding, and error-body secrecy.
- [x] 3.3 PR2a-fix GREEN→REFACTOR: Next relays Spring login/logout, forwards Spring `Set-Cookie` on its own response, uses the relays from signin/dashboard, and retains legacy NextAuth when Spring auth is disabled.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Unit | ✅ 23/23 focused tests before corrective coverage | ✅ Original task RED was recorded in prior apply-progress; corrective tests cover already-green production behavior, so they passed immediately without production edits | ✅ 25/25 focused tests; 433/433 full suite | ✅ Authorized browser pass-through and 502 unavailable add distinct paths to the existing anonymous/403/unavailable coverage | ➖ None needed — test-only corrective retry |
| 2.1 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayEmptyDatabaseIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 2/2 focused, 203/203 full Maven | ✅ V1 catalog/history/checksum and validation | ➖ None needed |
| 2.2 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/FlywayAdoptionIntegrationTest.java` | PostgreSQL integration | ✅ Prior work unit | ✅ Recorded in prior apply-progress | ✅ 3/3 focused, 203/203 full Maven | ✅ Adoption, drift rejection, and catalog preservation | ➖ None needed |
| 2.3 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/ReconciliationEvidencePersistenceTest.java` | PostgreSQL integration | ✅ 3/3 focused before corrective retry | ✅ Test-first retry failed at compilation because canonical factory/getters did not exist | ✅ 3/3 focused on PostgreSQL 16; 203/203 full Maven | ✅ Exact canonical bytes, independently derived SHA-256 binding, incomplete/malformed rejection, and UPDATE/DELETE/TRUNCATE paths | ✅ TEXT snapshots preserve canonical bytes; pgcrypto constraints bind every snapshot to its SHA-256 hash |
| 2.4 | `backend/src/test/java/com/meinardi/rrhh/{application/AdminSettingsReconciliationServiceTest,infrastructure/ReconciliationEvidencePersistenceTest}.java` | Unit + PostgreSQL integration | ✅ 9/9 existing focused tests before this retry | ✅ New factory/getter assertions failed to compile before the durable binding API existed | ✅ 10/10 service+persistence, 15/15 focused PostgreSQL with Flyway, 210/210 full Maven | ✅ Missing MATCHED email and missing RESET_APPROVED product fields reject at PostgreSQL; complete MATCHED and RESET_APPROVED rows persist | ✅ V3 status-dependent check constraint and factory mappings keep each status explicit |
| 2.5 | `backend/src/test/java/com/meinardi/rrhh/infrastructure/ReconciliationBackfillIntegrationTest.java` | PostgreSQL integration | ✅ 8/8 focused before this correction | ✅ A real V3 fixture with valid immutable evidence failed V5 because `reconciliation_runs.report_checksum` was NULL | ✅ 10/10 focused PostgreSQL; 220/220 full Maven | ✅ Valid V3→V5 succeeds from derived approval checksum while conflicting V3 approval checksums block; previous MATCHED/reset/drift and UNIQUE `23505` cases remain | ✅ V2/V3 remain untouched; V4 inserts an append-only derived-checksum table and V5 prefers it only when the run column is NULL |
| 3.1 | `src/lib/__tests__/healthRoute.test.ts`, `backend/src/test/java/com/meinardi/rrhh/{application/HealthServiceTest,presentation/HealthControllerTest}.java` | Unit + MockMvc | ✅ 2/2 existing health Vitest; 14/14 focused Spring security tests | ✅ Next contract tests failed against Prisma behavior; Spring tests failed to compile before the health service/controller existed | ✅ 2/2 focused Vitest; 4/4 focused Maven; 433/433 full Vitest; 224/224 full Maven | ✅ Ready/unavailable paths prove no Prisma fallback, Spring forwarding, database `SELECT 1`, and browser 200/503 no-store behavior | ➖ None needed — small controller/service and adapter are already direct |
| 3.2 | `src/lib/__tests__/springAuthRelayRoute.test.ts` | Unit | N/A (new route contracts) | ✅ 4/4 failed because relay route modules did not exist | ✅ 4/4 route contracts passed | ✅ Login success/unavailable and error branches; logout cookie-forwarding branch | ✅ Shared relay isolates cookie copying and avoids leaking Spring error bodies |
| 3.3 | `src/lib/__tests__/signinPageSpring.test.tsx` | Unit | ✅ 25/25 Spring session/proxy tests | ✅ 4/4 signin tests failed because it called Spring directly | ✅ 8/8 relay + signin tests; 33/33 focused | ✅ Success/error plus normalized credentials and logout cookie path | ✅ Kept NextAuth branch unchanged; Spring branch uses only same-origin endpoints and avoids a redundant post-login refresh |
| 3.4 | `backend/src/test/java/com/meinardi/rrhh/presentation/AuthSessionLifecycleTest.java`, `src/lib/__tests__/{springSession,proxySpringSession}.test.ts`, `tests/e2e/auth-spring-session.spec.ts` | Spring + Next + E2E | ✅ 23 focused Spring session/security tests and 15 focused Next tests passed before this fix | ✅ Spring lifecycle tests failed 200/204 expectations because `/auth/me` and `/logout` revalidated after the filter; Next tests failed to preserve Spring's rotated `SESSIONID` | ✅ 34 focused Spring tests; 20 focused Vitest tests; headed Chromium passed against ephemeral PostgreSQL/Spring/Next | ✅ Valid `/auth/me` uses the filter's authenticated principal; Spring's refreshed or expired `SESSIONID` is relayed through the Next proxy | ✅ Auth filter remains the sole validator; controller only maps the validated principal and performs explicit logout invalidation |

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
- RED: `npx vitest run src/lib/__tests__/springAuthRelayRoute.test.ts src/lib/__tests__/signinPageSpring.test.tsx` — failed because relay routes did not exist and signin still invoked NextAuth/direct Spring.
- Focused GREEN: same command — 8/8 passed; expanded focused relay/session/proxy run — 33/33 passed.
- Full: `npm run test:unit` — 437/437 passed after `DATABASE_URL=... npx prisma generate`; `npm run lint` and `npm run typecheck` — passed.
- Browser (corrective retry): launched an ephemeral PostgreSQL 16 container, Spring process, Next dev server, and generated admin outside the repository; credentials and logs were removed afterward. Focused headed Chromium passed 5/6: login reached real `/admin` UI, rejected sign-in/404 false positives, and installed `SESSIONID`. Logout received 401 because the Spring session becomes invalid after the first proxied `/api/v1/auth/me`; the required cookie-clearing proof cannot pass. No browser task is marked complete.
- Focused lifecycle fix: `mvn test -Dtest=AuthControllerTest,AuthSessionLifecycleTest,SessionServiceTest,SecurityConfigApplicationRoutesTest` — 34/34 passed; `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxySpringSession.test.ts src/lib/__tests__/springAuthRelayRoute.test.ts` — 20/20 passed; `npm run lint`, `npm run typecheck`, and `git diff --check` — passed. A headed Chromium run against temporary PostgreSQL 16, Spring, and Next proved login, proxied `/auth/me` validation, logout redirect, and absent `SESSIONID`; all processes/container were stopped afterward.
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
- Safety net: `npx vitest run src/lib/__tests__/healthRoute.test.ts` — 2/2 passed; `cd backend && mvn test -Dtest=SecurityConfigApplicationRoutesTest` — 14/14 passed.
- RED: `npx vitest run src/lib/__tests__/healthRoute.test.ts` — 2 failures because the route still called Prisma instead of Spring.
- RED: `cd backend && mvn test -Dtest=HealthControllerTest` — compilation failed because `HealthService` and `HealthController` did not exist.
- Focused GREEN: `npx vitest run src/lib/__tests__/healthRoute.test.ts` — 2/2 passed; `cd backend && mvn test -Dtest=HealthControllerTest,HealthServiceTest` — 4/4 passed.
- Full: `npm run test:unit` — 433/433 passed after `DATABASE_URL=... npx prisma generate`; `npm run lint` and `npm run typecheck` — passed.
- Full Maven: `cd backend && mvn test` — 224/224 passed.
- `git diff --check` — passed.

## Status

PR2a-fix implementation is complete for tasks 3.2–3.4. Spring's auth filter is the sole session validator, so `/auth/me` and `/logout` use the current filter principal rather than invalidating a valid session a second time. Next now propagates Spring's rotated and expired `SESSIONID` values from proxy validation responses. Headed Chromium proves valid validation followed by logout clears the browser cookie. Notifications, audit, settings, retention, and Prisma removal remain untouched. No commit or push was performed.
