# Apply Progress: Move Admin Operations and Remove Prisma — PR2c-d application audit

## Delivery

- Strategy: feature-branch-chain.
- Boundary: `PR2c-c → PR2c-d`; application detail GET/PATCH/DELETE only.
- Excluded: vacancy-detail, contacts, candidates, settings, retention, Prisma decommission, and later call sites.
- Rollback: revert the application route proxy, `AuditedApplicationAdmin`, and focused contracts; Spring audit ownership remains intact.

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

## Remediation: Task 2.3 — Vacancy and Contact Detail Spring-Session Parity

- Native attempt token: `sha256:25abd419fa02e44c9904c256031a36c33c0b7229c040a28df3924db950e31864` (reused; no additional attempt acquired).
- Scope: `GET /api/vacancies/[id]` and `GET/PATCH/DELETE /api/contacts/[id]` only; candidates, applications, settings, retention, public policy, ORM gate, and decommission remain excluded.
- [x] RED: added focused route contracts for Spring authorization states, no NextAuth fallback, original/rotated `SESSIONID`, upstream `Set-Cookie` relay, and public active-vacancy visibility.
- [x] GREEN: vacancy detail uses optional Spring-session authorization for public visibility and protected sessions; contact detail and mutations use Spring-session authorization when enabled and legacy NextAuth only when disabled.
- [x] REFACTOR: reused `authorizeDashboardRead`, retained origin/DTO/status/error behavior, and avoided Prisma or Spring controller changes.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.3 | `src/lib/__tests__/vacancyDetailRoute.test.ts` | Unit route/BFF | ✅ 36/36 passed | ✅ 5 new Spring detail/public contracts failed before implementation | ✅ 41/41 passed | ✅ authorized rotation, anonymous/forbidden/unavailable, and anonymous public active vacancy | ✅ minimal optional-session branch and upstream error relay |
| 2.3 | `src/lib/__tests__/contactStatusRoute.test.ts` | Unit route/BFF | ✅ 20/20 passed | ✅ 4 new Spring detail contracts failed before implementation | ✅ 26/26 passed | ✅ authorized rotation, three denial states, legacy GET fallback, and legacy PATCH/DELETE fallback; existing denial/cookie cases remain green | ✅ shared dual-mode authorizer and append-only cookie relay |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | `npm run test:unit -- src/lib/__tests__/vacancyDetailRoute.test.ts src/lib/__tests__/contactStatusRoute.test.ts` — 2 files, 67/67 passed. |
| Runtime harness command/scenario and exact result | N/A — this bounded route unit slice has no additional live Spring harness; upstream request/response, authorization, cookie, and public visibility paths are exercised with focused BFF contracts. |
| Quality checks | `npm run typecheck` — passed; `npm run lint` — passed; `git diff --check` — passed. |
| Rollback boundary | Revert `src/app/api/vacancies/[id]/route.ts`, `src/app/api/contacts/[id]/route.ts`, and their two focused route test files; no Spring controller/security, public list, settings, retention, policy, ORM, or decommission code is touched. |

### Completion

- [x] Task 2.3 bounded vacancy/contact detail Spring-session parity is implemented with the supplied native attempt token and without commit, push, fetch, remotes, or persistent database changes.

## Evidence Constraint

Original migration RED history was not retained after reconstruction. The PR2b-c item-adapter and PR2c-a audit RED→GREEN evidence above is executed in this worktree; it MUST NOT be generalized to earlier Spring notification or collection changes.

## Status

Tasks 2.1–2.3, 3.1–3.2, 3.3a, 3.4, and 4.1 are complete. PR2c-c remains in progress: vacancy-detail and contact call sites (3.3b) are intentionally pending. This slice excludes those routes, candidates, retention, and Prisma decommission.

---

# Apply Progress: Spring-Session Dashboard Read Authorization

## Cumulative Completed Work

- [x] Prior notification session-rotation corrective slice: collection/item contracts and first-read live verification retain validation-rotated `SESSIONID` cookies.
- [x] Slice 1 (1.1–1.8): shared dual-mode dashboard authorizer plus vacancy/application protected reads, contracts, and fresh-login Chromium coverage.
- [x] Slice 2 (2.1–2.4): contacts admin-list read adopts the shared authorizer; S1 and upstream cookies relay append-only, Spring 401/403/503 never fall back, and legacy NextAuth is only used with Spring auth disabled.
- [x] Verification remediation (4.1–4.3): restores the public vacancy non-2xx envelope, makes Spring-preflight unavailability return the 503 unavailable envelope across dashboard reads, and retains S1 on the applications missing-backend exit.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1–2.2 | `src/lib/__tests__/contactsRoute.test.ts` | Unit | 4/4 focused baseline | S1 relay and Spring-denial contracts failed against the legacy NextAuth route | 8/8 passed | authorized S0→S1 with upstream cookie, three denial states, and disabled-Spring legacy path | Reused the shared boundary; no further refactor needed |
| 2.3 | `tests/e2e/auth-spring-session.spec.ts` | E2E | Existing focused auth E2E | Fresh-login contacts scenario added before adapter implementation | 1/1 Chromium passed | Contacts joins independently verified vacancy/application first reads | No production refactor needed |
| 2.4 | focused Vitest + Playwright | Unit/E2E | 8 focused contracts | N/A | 8/8 Vitest and 1/1 Chromium passed | Authorization, cookie relay, legacy, and live fresh-login paths | Typecheck and whitespace check passed |
| 4.1–4.3 | `vacancyRoute`, `applicationsListRoute`, `contactsRoute` contracts | Unit | ✅ 32/32 focused baseline | ✅ Five regression assertions failed before route changes | ✅ 34/34 focused contracts passed | ✅ Public success/failure, 401/403/503 envelopes, S1 validation/missing-backend exits | ✅ Minimal route-local envelopes and cookie relay; no security-model change |

## Verification

- `npx vitest run src/lib/__tests__/contactsRoute.test.ts` — 8/8 passed.
- `E2E_BASE_URL=http://127.0.0.1:3001 … npx playwright test --config=playwright.local.config.ts tests/e2e/auth-spring-session.spec.ts --project=chromium --grep 'dashboard read /api/contacts'` — 1/1 passed.
- `npm run typecheck` and `git diff --check` — passed.
- `npx vitest run src/lib/__tests__/vacancyRoute.test.ts src/lib/__tests__/applicationsListRoute.test.ts src/lib/__tests__/contactsRoute.test.ts` — 34/34 passed after remediation.
- `npm run test:coverage` — 83 files, 568 tests passed; statements 88.14%, branches 79.72%, functions 96.07%, lines 88.92%.
- `npm run lint`, `npm run typecheck`, and `git diff --check` — passed.
- `npx playwright test --config=playwright.local.config.ts tests/e2e/api-smoke.spec.ts` — 15/15 passed against the existing local server. The default Playwright server could not acquire the already-held `.next/dev/lock`, so no process was stopped or replaced.

## Boundary

Feature-branch-chain Slice 2; intended child PR base is the immediate Slice 1 branch, never `main`. Scope is limited to contacts admin-list GET, its contracts, and one fresh-login E2E path. The Slice 2 route/test/E2E changes are 89 additions and 24 deletions (113 changed lines, ≤180). No commit, push, fetch, or remote operation was performed.

## Corrective Work-Unit Boundary

The original Slice 1 is already recorded at 297 changed lines (≤300), so its vacancy/application remediation cannot be absorbed without exceeding that slice's budget. Phase 4 is one bounded corrective work unit: public vacancy error parity plus unavailable-envelope contracts for the three dashboard reads and the applications missing-backend S1 relay. Contacts remains within its original Slice 2 budget. No contacts payload, query, authorization, legacy-cookie, or security-model behavior changed.

## Corrective Slice 3: Auth E2E Stabilization

- [x] 3.1–3.2 Logout 204 now appends all upstream cookies and an explicit Next-origin `SESSIONID` expiry; production adds `Secure`.
- [x] 3.3–3.4 Handoff E2E no longer waits for dashboard heading/data readiness; browser-context logout proves the Next-origin jar is cleared.

### TDD Cycle Evidence

| Task | Test / layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 3.1 | `springLogoutRoute.test.ts` / Unit | 3/3 existing relay tests | ✅ 3 failed | ✅ 6/6 focused passed | ✅ 204, production, non-204 | ✅ append-only relay |
| 3.2 | `springLogoutRoute.test.ts` / Unit | ✅ route baseline | ✅ contract first | ✅ 6/6 passed | ✅ upstream list retained | ✅ minimal route change |
| 3.3 | `auth-spring-session.spec.ts` / E2E | Existing auth spec | ✅ assertion rewritten first | ⚠️ skipped: auth env unset | ✅ handoff-only assertions | ✅ removed readiness wait |
| 3.4 | `auth-spring-session.spec.ts` / E2E | Existing logout case | ✅ browser contract first | ⚠️ skipped: auth env unset | ✅ response + jar assertions | ✅ no dashboard navigation |

### Work Unit Evidence

- Focused: `npm run test:unit -- src/lib/__tests__/springLogoutRoute.test.ts src/lib/__tests__/springAuthRelayRoute.test.ts` — 2 files, 6/6 passed.
- Runtime: `npm run test:e2e -- tests/e2e/auth-spring-session.spec.ts --project=chromium --grep 'logs in via Spring and hands|Next-origin'` — 2 scenarios skipped because `SPRING_AUTH_ENABLED`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `BACKEND_URL` are unset.
- Quality: `npm run test:unit` — 84 files, 571 tests passed; `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Rollback: revert `src/app/api/auth/spring/logout/route.ts`, `src/lib/__tests__/springLogoutRoute.test.ts`, and the two focused E2E assertions; no dashboard UI or unrelated auth behavior is touched.

## Status

Tasks 3.1–3.4 are implemented. Phase 4 task 4.1 is complete: the captured isolated Spring-auth Chromium run exited 0, and the prior fresh protected-read and notification evidence is recorded above. The corrective auth stabilization diff is 137 changed lines (≤180).

## Phase 4: Slice Verification — Task 4.1 Complete

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | `npm run test:unit -- src/lib/__tests__/springLogoutRoute.test.ts src/lib/__tests__/springAuthRelayRoute.test.ts` — 2 files, 6/6 passed. |
| Runtime harness command/scenario and exact result | `SPRING_AUTH_E2E_SPEC=tests/e2e/auth-spring-session.spec.ts npm run test:e2e:spring-auth` — exit 0; Spring Chromium login → `/admin` → logout proof passed. |
| Prior fresh protected-read evidence | Authored Chromium 2/2 plus independent browser/API replay: protected vacancy and applications reads returned 200, each relayed a changed SESSIONID S0→S1, and direct Spring `/api/v1/auth/me` authorized S1 with 200. |
| Prior fresh notification evidence | Targeted Chromium 1/1: login 200 → first `/api/admin/notifications` 200 (not 401), rotated HttpOnly `/` `SESSIONID` retained, and direct Spring `/api/v1/auth/me` returned 200. |
| Corrective diff and rollback boundary | 137 changed lines (≤180); revert `src/app/api/auth/spring/logout/route.ts`, `src/lib/__tests__/springLogoutRoute.test.ts`, and the focused E2E assertions only. |

### Completion

- [x] 4.1 focused logout contracts, isolated Spring-auth Chromium proof, prior protected-read/notification runtime evidence, and corrective diff budget are recorded.

## Remediation: Task 2.1 — Candidate Export Spring-Session Parity

- Native attempt: `sha256:8dee481132b5e4df086aa49717134ab56b4ffca9d5aa45e52f48e808c5f901f6`.
- Failed evidence lineage: `sha256:008d1c7d433b9e662405fe856fd46a3cae46735a422dfcfda17b40002b7ba569`.
- Scope: candidate export only; applications export, retention, settings, ORM gate, and unrelated routes remain excluded.
- [x] RED: replaced legacy export contracts with Spring-session, rotation, query-forwarding, and envelope contracts; removed the Prisma boundary and added a Spring-side query contract.
- [x] GREEN: candidate export now uses the shared Spring-session boundary, forwards original/rotated `SESSIONID` and unchanged `search`, relays cookies, and keeps NextAuth only in legacy mode; Spring supports candidate search.
- [x] REFACTOR: retained existing CSV rendering (`buildCandidateSummaries()` → `ExportCandidatesUseCase`) and minimal Spring application-list compatibility.

### Remediation Verification

- `npx vitest run src/lib/__tests__/candidatesExportRoute.test.ts` — 8/8 passed.
- `cd backend && mvn test -Dtest=ApplicationRestControllerTest,ApplicationManagerTest` — 39/39 passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `git diff --check` — passed for the bounded task files.
- Bounded diff: 399 changed lines including implementation/tests and SDD artifacts (376 implementation/test lines); preserved `.vscode/` and `docs/code.html`.

### Completion

- [x] Task 2.1 candidate export Spring-session/query parity is implemented and verified without commit, push, fetch, or remote operations.

## Remediation: Task 2.2 — Applications Export Spring Parity

- Native recovery token: `sha256:5d67f211fff3f27251484bc102896c6a4c9d47e8c16693e21e88f82c73829091` (reused; no additional attempt acquired).
- Failed evidence revision: `sha256:23fcb34e248cb61aabce38528194a8589463a730694e72f53972efe7dcd2b490`.
- Scope: applications CSV export only; retention, settings, ORM gate, decommission, and unrelated routes remain excluded.
- [x] RED: the recovery contract added the missing assertion that invalid filters do not invoke Spring session validation; the candidate failed 1/6 tests (5 passed).
- [x] GREEN: query validation now runs before Spring session/backend resolution, returning the exact 400 envelope without contacting Spring; all focused contracts pass.
- [x] REFACTOR: retained the shared authorizer, Spring list sort overload, existing CSV use case, cookie relay, and disabled-mode-only NextAuth fallback.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.2 recovery | `src/lib/__tests__/applicationsExportRoute.test.ts` | Vitest unit/BFF | ✅ existing export/session/error contracts | ✅ 1 failed, 5 passed: invalid-filter contract detected Spring session contact | ✅ 6/6 focused BFF; ✅ 40/40 focused Spring | ✅ filtered/rotated CSV, status/vacancy/search/sort forwarding, 400/401/403/503/500, no Prisma, and legacy-only NextAuth path | ✅ validation ordering only; no unrelated route or Spring behavior changed |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | `npm run test:unit -- src/lib/__tests__/applicationsExportRoute.test.ts` — 6/6 passed; `mvn test -Dtest=ApplicationRestControllerTest,ApplicationManagerTest` — 40/40 passed. |
| Runtime harness command/scenario and exact result | `mvn test -Dtest=ApplicationRestControllerIntegrationTest` — 11/11 passed against disposable H2; no live Next→Spring export harness exists in this repository. |
| Quality checks | `npm run test:unit` — 84 files/580 tests passed; `npm run test:coverage` — 84 files/580 tests passed, 88.70% statements, 79.63% branches, 96.37% functions, 89.39% lines; `npm run typecheck`, `npm run lint`, and bounded `git diff --check` — passed. |
| Rollback boundary | Revert `src/app/api/applications/export/route.ts`, its focused contracts, and the four Spring list query files/tests; no candidate export, retention, settings, ORM, or decommission behavior is touched. |

### Completion

- [x] Task 2.2 applications export Spring-session/query/CSV parity is corrected and verified with the supplied native recovery token, without commit, push, fetch, remote refs, or persistent database changes.

## Recovery: Task 2.4 — Settings Reconciliation Live Parity

- Native recovery token: `sha256:3a1909a1d5c634b644a28f1b0eeda473a30591842c429913719210ea0c715ca2` (reused; no additional attempt acquired).
- Scope: disposable Spring-auth settings fixture and live settings parity only; retention, ORM, decommission, and production settings behavior remain excluded.
- [x] Inspected the existing partial fixture and compared it with the settings contract, V5/V6 sequence, reconciliation tests, and Chromium harness.
- [x] Corrected the fixture to build sorted canonical JSON snapshots once, reuse their SHA-256 hashes, seed legacy `User`/`AdminSettings`, target `Usuario`, one report checksum, and a `MATCHED` approval after V4 and before V5/V6.
- [x] Added a post-V6 harness guard that checks the target mapping, immutable snapshot hashes, matching approval hashes, normalized email, status, and report checksum before launching Next/Chromium.
- [x] Added the live Chromium contract: login → settings GET 200 → settings PATCH 200 → settings GET 200 with persisted name and preference changes.

### Recovery Evidence (prior blocked attempt)

| Evidence | Exact result |
|---|---|
| Existing RED | Prior fresh verification recorded four settings GET 404 responses because the disposable runner lacked reconciled `User`/`AdminSettings`/`Usuario` evidence (`verify-report.md`). |
| Focused adapter test | `npm run test:unit -- src/lib/__tests__/adminSettingsRoute.test.ts` — 1 file, 12/12 passed. |
| Type/lint/whitespace | `npm run typecheck` — passed; `npm run lint` — passed; `git diff --check -- scripts/run-spring-auth-e2e.ts tests/e2e/auth-spring-session.spec.ts` — passed. |
| PostgreSQL reconciliation tests | `mvn test -Dtest=AdminSettingsServiceIntegrationTest,ReconciliationBackfillIntegrationTest` — blocked before test execution by Docker/Testcontainers missing blob `sha256:dd3f023a6ed7015b3f95a49ccd65a2daf0c56e681422c12952b19a810dfa6298` (`input/output error`). |
| Live Chromium harness | `npm run test:e2e:spring-auth` — blocked before disposable PostgreSQL creation by Docker missing blob `sha256:33f923b05f64ca54ac4401c01126a6b92afe839a0aa0a52bc5aeb5cc958e5f20` (`input/output error`); no `spa_rrhh_db` access. |

### Historical Status

- Partial settings state was corrected in the runner and live E2E contract.
- Task 2.4 was intentionally left unchecked because the required fresh PostgreSQL-backed Chromium proof could not execute while Docker image storage was corrupted.

## Recovery Verification: Task 2.4 Complete

- Native recovery token: `sha256:ca5c9c782969daf9d5f678a8d0379f6af5633f17002edb3dee3508d71987c78c` (supplied attempt; no additional acquire or reset).
- Scope remained limited to settings reconciliation evidence, the disposable Spring-auth fixture, and the settings Chromium contract. No production settings implementation, unrelated work, or persistent `spa_rrhh_db` was changed.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.4 recovery | `src/lib/__tests__/adminSettingsRoute.test.ts`, `tests/e2e/auth-spring-session.spec.ts`, `AdminSettingsServiceIntegrationTest`, `ReconciliationBackfillIntegrationTest` | Unit + PostgreSQL integration + Chromium E2E | ✅ Prior focused adapter/Spring baselines | ✅ Prior recovery contracts were written before the fixture correction; the prior run exposed the missing evidence as settings 404s | ✅ Fresh focused, PostgreSQL, and Chromium runs passed | ✅ GET/PATCH/GET persistence, immutable hash/checksum binding, V1–V6 sequencing, and post-V6 MATCHED guard | ✅ No production refactor; fixture canonicalization remains centralized and reusable |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | `npm run test:unit -- src/lib/__tests__/adminSettingsRoute.test.ts` — 1 file, 12/12 passed; `mvn test -Dtest=AdminSettingsServiceIntegrationTest,ReconciliationBackfillIntegrationTest` — 11/11 passed against disposable PostgreSQL 16 (1 settings service + 10 reconciliation/Flyway cases). |
| Runtime harness command/scenario and exact result | `npm run test:e2e:spring-auth` — exit 0; disposable PostgreSQL 16 applied V1–V4, seeded legacy `User`/`AdminSettings`, target `usuario`, canonical snapshots/hashes, report checksum, and `MATCHED` approval, then applied V5/V6; 13/13 Chromium cases passed, including settings login → GET 200 → PATCH 200 → GET 200 with persisted name and `notifyNewContacts=true`. |
| Quality checks | `DATABASE_URL=postgresql://localhost:9/verification_never_touch npm run test:unit` — 84 files, 591/591 passed; `npm run typecheck` — passed; `npm run lint` — passed; bounded `git diff --check` — passed. |
| Runtime setup | Docker Desktop 29.7.2 was healthy; missing local Playwright Chromium was installed in the user cache only. No repository or persistent database mutation occurred. |
| Rollback boundary | Revert `scripts/run-spring-auth-e2e.ts`, `tests/e2e/auth-spring-session.spec.ts`, and the Task 2.4 entries in `tasks.md`/`apply-progress.md`; no production settings service, route, migration, retention, ORM, or decommission behavior is touched. |

### Completion

- [x] Task 2.4 settings reconciliation live parity is implemented and freshly verified with the supplied native attempt, disposable PostgreSQL, Spring, and Chromium; no commit, push, fetch, remote operation, or persistent database change was performed.

---

# Phase 3: CV Retention — Task 3.1 Complete

- Native attempt token: `sha256:0c88424cc61a541cbb0a97468a915f246b8df0a08c6b3c164baf8f386ac3e9a8`.
- Scope: CV retention scheduling, exact-key leased work items, remote deletion contract, and transactional candidate metadata cleanup only. Audit retention, public policy, ORM removal, and decommission remain excluded.
- [x] RED: authored focused unit and PostgreSQL/Testcontainers contracts for dry-run, unique candidate/key work items, concurrent leasing, exact-key deletion, supersession, absent-object idempotency, retry/backoff, terminal failure, lease reclamation, and stale-worker protection.
- [x] GREEN: added `CvRetentionService`, `CvRetentionWorker`, storage/error contracts, JDBC lease/conditional-completion repository, and Flyway V7 work-item schema.
- [x] REFACTOR: candidate discovery now matches the existing retention rule: at least one application is at or before cutoff and no newer application exists; lease-token ownership prevents stale workers from changing reclaimed items.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `CvRetentionWorkerTest`, `CvRetentionServiceTest` | JUnit + Mockito | ✅ Existing Spring test baseline | ✅ Contracts were authored before the implementation | ✅ 8/8 focused tests passed | ✅ Success, superseded, absent-object, retry/failure, lease-loss, dry-run, and idempotency paths | ✅ Small application contracts with repository-owned transaction boundaries |
| 3.1 | `CvRetentionWorkRepositoryIntegrationTest` | Spring + PostgreSQL 16/Testcontainers | ✅ Flyway adoption/empty-database coverage | ✅ Concurrency and conditional-write contracts were authored before repository implementation | ✅ 5/5 integration tests passed | ✅ Candidate cutoff classification, concurrent `SKIP LOCKED`, expired lease reclamation, conditional supersession, and stale-token protection | ✅ Exact-key unique index and lease-token predicates |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `mvn test -Dtest=CvRetentionWorkerTest,CvRetentionServiceTest,CvRetentionWorkRepositoryIntegrationTest` — 13/13 passed; PostgreSQL 16 Testcontainers applied Flyway V1–V7 successfully. |
| Quality checks | `npm run typecheck` — passed; `npm run lint` — passed; `git diff --check` — passed. |
| Schema/result safety | Work items are unique by `(candidate_id, expected_resume_key)`; completion clears all three resume metadata columns only when the current key still equals the expected key; lease-token predicates reject stale workers. |
| Rollback boundary | Revert the CV retention application/infrastructure/test files, Flyway V7, and this task evidence; no audit, policy, ORM gate, or decommission behavior is touched. |

### Completion

- [x] Task 3.1 CV retention lease/concurrency, exact-key deletion, supersession, retry/five-attempt, expired-lease, absent-object, dry-run, and transactional cleanup behavior is implemented and targeted-verified without commit, push, fetch, remote operation, or persistent database changes.
