# Apply Progress: Move Admin Operations and Remove Prisma

## Delivery

- Strategy: feature-branch-chain.
- Committed chain through `PR2d`: `PR2c-c → PR2c-d → PR2c-e → PR2d`.
- Current WIP boundary: remaining audit call sites only; it is a 646-line code aggregate including the untracked 38-line `AuditedAdminMutation` (678 lines with these OpenSpec edits) and must split before commit.
- Planned children: `PR2c-f0` audited-mutation foundation, `PR2c-f1` vacancy detail, then `PR2c-f2` contacts. Each child targets its immediate parent and carries its focused tests.
- Excluded: retention, Prisma decommission, and any code outside the remaining vacancy-detail/contact audit paths.

## Completed Tasks

- [x] 2.1–2.5 reconciliation/Flyway chain (previous batches).
- [x] 3.1 Spring health ownership (previous batch).
- [x] 3.4 PR2a-fix-a2 RED: layout and Chromium relay contracts cover Spring-mode provider omission, `/admin`, and same-origin login.
- [x] 3.5 PR2a-fix-a2 GREEN→REFACTOR: gate global NextAuth/Sentry providers in Spring mode and align Playwright server flags.
- [x] 3.6 PR2a-fix-a2 verify: focused runtime browser proof, lint, and typecheck pass.
- [x] 3.7 PR2a-fix-b RED: focused Vitest contracts fail until Spring validation `Set-Cookie` reaches the session state and proxy response.
- [x] 3.8 PR2a-fix-b GREEN→REFACTOR: preserve the raw Spring `Set-Cookie` for authorized rotation and anonymous expiry only; harden the temporary browser cookie/logout proof.
- [x] 3.9 PR2a-fix-b verify: focused JUnit/Vitest, Chromium proof, lint, typecheck, and whitespace check pass.
- [x] 3.10 PR2b-a Spring notification API, persistence, DTOs, validation/error envelope, and authorization contracts.
- [x] 3.11 PR2b-b Next notification collection adapter and contracts.
- [x] 3.12 PR2b-c Next notification item PATCH/DELETE Spring proxy and Chromium proof.
- [x] 3.13 PR2b-c evidence constraint recorded.
- [x] 2.1 PR2c-a RED: JUnit/MockMvc/Testcontainers contracts for audit pagination, UTC bounds, filters, 401/403, and 500.
- [x] 2.2 PR2c-a GREEN: Spring audit model, repository, transactional write API, controller, and Flyway filter index.
- [x] 2.3 PR2c-a REFACTOR/verify: focused Maven suite passes against PostgreSQL 16; scope excludes all downstream slices.
- [x] 3.1 PR2c-b RED: Vitest contracts cover audit filter/envelope forwarding, UTC dates, validation, authorization errors, Spring failures, no-store, and no Prisma fallback.
- [x] 3.2 PR2c-b GREEN→REFACTOR: the thin Spring proxy preserves the validated query and forwards authorized `SESSIONID` rotation to both the audit request and browser response.
- [x] 3.3a PR2c-c RED→GREEN→REFACTOR: cut over `POST /api/vacancies` to Spring-session actor forwarding and the transactional Spring `vacancy.create` audit path. The proxy relays rotated/expiry cookies on every session, validation, CSRF, and Spring-error exit; it only forwards validated first-hop IP and bounded user-agent context. Spring records SUCCESS in the mutation transaction and ERROR independently if the success audit fails.
- [x] 3.4 PR2c-d RED→GREEN→REFACTOR: cut over application detail GET/PATCH/DELETE from NextAuth/Prisma audit calls to Spring-session forwarding and the transactional `AuditedApplicationAdmin` path. `application.view` ERROR is independently durable, while failed SUCCESS audit rolls back a status mutation and persists ERROR.
- [x] 4.1 PR2d RED→GREEN→REFACTOR: Spring now owns settings GET/PUT through the reconciled `usuario`/`AdminSettings` mapping; the Next PATCH adapter validates locally, preserves the browser response/error/cookie/no-store contracts, and forwards to Spring PUT without a Prisma fallback.
- [ ] 3.3b PR2c-f WIP: the combined vacancy-detail/contact implementation validates Spring sessions, forwards rotated cookies, removes Next Prisma audit calls, makes mutation+SUCCESS atomic, records ERROR independently after rollback, and maps DENIED events in Spring. It passed focused tests, but none of its code is committed; split it into PR2c-f0/f1/f2 before claiming delivery.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.4 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Spring-mode omission contract failed before the layout change | ✅ Focused layout contracts passed | ✅ Spring and legacy modes | ✅ Minimal root conditional |
| 3.5 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Browser contract extended before config change | ✅ Focused tests passed | ✅ `/admin` anonymous and authenticated routes | ✅ Dedicated matching server flags |
| 3.7–3.8 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Vitest unit | ✅ 14 Spring-session/proxy tests; ✅ 11 proxy-branch tests | ✅ Four new rotation/expiry assertions failed before forwarding | ✅ 29 focused tests passed | ✅ Authorized rotation and anonymous expiry preserve separate outcomes | ✅ Small typed response-cookie helper; forbidden/unavailable remain unchanged |
| 3.9 | `tests/e2e/auth-spring-session.spec.ts` | Chromium E2E | ✅ Earlier proof exposed an immediate cookie race and missing confirmation interaction | ✅ Hardened proof failed until it awaited `/admin`, dismisses the fixture onboarding, and confirms logout | ✅ Login, cookie persistence, direct `/admin`, logout expiry, anonymous redirect | ✅ Test-only stabilization; production forwarding unchanged |
| 3.12 | `src/lib/__tests__/adminNotificationByIdRoute.test.ts`, `tests/e2e/admin-notifications.spec.ts` | Vitest + Chromium | ✅ Legacy item-route test: 1/1 passed before replacement | ✅ Six Spring-proxy contracts were written first and failed while the legacy Prisma route loaded | ✅ 6/6 focused item contracts passed after the minimal proxy; PATCH and DELETE exercise distinct paths | ✅ Chromium used temporary PostgreSQL 16, Spring, and an ephemeral admin; persisted read state and deletion through browser-issued Next requests |
| 3.13 | `tasks.md`, this artifact | Evidence | N/A — documentation-only | N/A — no production behavior | N/A — records only executed evidence | ✅ Explicitly preserves the reconstructed-history limitation |
| 2.1–2.3 | `AuditControllerTest`, `AdminAuditLogRepositoryIntegrationTest`, Flyway adoption/empty tests | MockMvc + PostgreSQL 16 | ✅ 4 audit tests passed before correction | ✅ Blank filters returned 500; V6 assertions expected V5 | ✅ 12 focused tests passed | ✅ Complete filters/options, non-default page, UTC bounds/order, transaction durability, immutable metadata, V6 adoption/checksum | ✅ Small blank-filter guard; existing query records retained |
| 3.1–3.2 | `src/lib/__tests__/adminAuditRoute.test.ts` | Vitest unit | ✅ 7/7 focused adapter contracts | ✅ Authorized rotation contract failed: the stale request cookie reached Spring and the response lacked `Set-Cookie` | ✅ 8/8 focused contracts passed after using the rotated cookie pair upstream and relaying the original `Set-Cookie` downstream | ✅ Existing non-rotation query contract plus rotation request/response assertions exercise distinct cookie paths | ✅ Minimal authorization result carrying `setCookie`; no call-site, settings, or retention changes |
| 3.3a | `src/lib/__tests__/vacancyRoute.test.ts`, `AdminAuditLogRepositoryIntegrationTest`, `VacancyExceptionHandlerTest` | Vitest + Spring/Testcontainers | ✅ Route 4/4; Maven failed because MVC lacked the new creator mock | ✅ Cookie relay/context and proxy-rollback assertions failed before wiring | ✅ 8/8 route, 4/4 audit integration, 6/6 MVC contracts pass | ✅ Success, anonymous expiry, validation, CSRF, mapped and unexpected Spring errors cover distinct exits | ✅ Allowlisted proxy context and minimal cookie relay; no vacancy-detail, contacts, settings, retention, or Prisma-decommission changes |
| 3.4 | `src/app/api/applications/[id]/__tests__/route.test.ts`, `AdminAuditLogRepositoryIntegrationTest` | Vitest + Spring/Testcontainers | ⚠️ Node dependencies were absent; Spring baseline 21/21 passed | ✅ Spring-session forwarding and transactional application-audit contracts failed before production changes | ✅ 27/27 focused Vitest and 6/6 PostgreSQL integration tests passed | ✅ GET/PATCH/DELETE session paths plus durable view ERROR and rolled-back update SUCCESS-audit failure | ✅ Primary audited decorator preserves the existing application boundary and route DTOs |
| 4.1 | `adminSettingsRoute.test.ts`, `AdminSettingsServiceIntegrationTest` | Vitest + PostgreSQL 16 | N/A — no prior focused settings adapter test; Spring compilation RED confirmed the absent service | ✅ Adapter test was written before replacement; backend test failed to compile before the service existed | ✅ 6/6 Vitest and 1/1 focused Spring PostgreSQL test passed | ✅ GET/PATCH-to-PUT, session outcomes, validation, response shape, and persisted preference/name update | ✅ Kept the Next browser PATCH contract while Spring exposes PUT; no Prisma fallback |
| 3.3b WIP | `vacancyDetailRoute.test.ts`, `contactStatusRoute.test.ts`, `AdminAuditLogRepositoryIntegrationTest`, `SecurityConfigTest` | Vitest + Spring/Testcontainers | ✅ 14 legacy detail/contact contracts passed | ✅ New rotated/expired session and transactional audit contracts failed before the cutover | ✅ 17/17 Vitest and 22/22 focused Maven tests passed | ✅ Authorized rotation, anonymous expiry, DENIED mapping, and vacancy/contact rollback paths | ⚠️ Aggregate is not a completed slice: split foundation, vacancy, and contact before commit. |

## Verification

- `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 29/29 passed.
- `cd backend && mvn test -Dtest=SessionServiceTest` — 9/9 passed.
- `npm run test:e2e:spring-auth` — isolated PostgreSQL + Spring + Next Chromium proof passed: login → `/admin` → confirmed logout.
- `npm run lint`, `npm run typecheck`, and `git diff --check` — passed.
- `npm run test:unit` — 81 files, 460 tests passed.
- `cd backend && mvn test -Dtest=NotificationControllerTest,NotificationServiceTest,AdminNotificationRepositoryIntegrationTest` — 10/10 passed.
- `npm run test:e2e:spring-auth` — temporary PostgreSQL 16 + Spring + Next Chromium proof passed (including item PATCH read-state persistence and DELETE removal).
- `cd backend && mvn test -Dtest=AuditControllerTest,AdminAuditLogRepositoryIntegrationTest,FlywayAdoptionIntegrationTest,FlywayEmptyDatabaseIntegrationTest` — 12/12 passed; Testcontainers PostgreSQL 16 applied Flyway V1–V6.
- `cd backend && mvn test` — 244/244 passed.
- `npm run test:unit -- src/lib/__tests__/adminAuditRoute.test.ts` — 8/8 passed after the rotation corrective retry.
- `npm run lint` — passed.
- `cd backend && mvn test` — 245/245 passed, including the real proxied transaction rollback and independently committed ERROR audit.
- `npm run test:unit` — 82 files, 473 tests passed.
- `npm run typecheck -- --skipLibCheck` — passed.
- `git diff --check` — passed.
- `npm run test:unit -- "src/app/api/applications/[id]/__tests__/route.test.ts" "src/lib/server/__tests__/springApplicationGateway.test.ts"` — 27/27 passed.
- `cd backend && mvn test -Dtest=AdminAuditLogRepositoryIntegrationTest` — 6/6 passed against Testcontainers PostgreSQL 16.
- `npm run test:unit -- "src/lib/__tests__/adminSettingsRoute.test.ts"` — 6/6 passed.
- `cd backend && mvn test -Dtest=AdminSettingsServiceIntegrationTest` — 1/1 passed against PostgreSQL 16.
- `npm run test:unit -- "src/lib/__tests__/vacancyDetailRoute.test.ts" "src/lib/__tests__/contactStatusRoute.test.ts"` — 17/17 passed.
- `cd backend && mvn test -Dtest=VacancyExceptionHandlerTest,AdminAuditLogRepositoryIntegrationTest,SecurityConfigTest` — 22/22 passed.
- `DATABASE_URL=postgresql://… npx prisma generate && npm run lint && npm run typecheck` — passed.
- `npm run test:unit` — 83 files, 498 tests passed.
- `cd backend && mvn test` — 265 tests passed.

## Evidence Constraint

Original migration RED history was not retained after reconstruction. The PR2b-c item-adapter and PR2c-a audit RED→GREEN evidence above is executed in this worktree; it MUST NOT be generalized to earlier Spring notification or collection changes.

## Status

Tasks 2.1–2.3, 3.1–3.5, and 4.1 are complete. Task 3.3b is validated uncommitted WIP, not completed delivery: it remains split into pending PR2c-f0/f1/f2. Retention and Prisma decommission remain out of scope.
