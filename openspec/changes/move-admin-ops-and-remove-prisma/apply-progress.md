# Apply Progress: Move Admin Operations and Remove Prisma — PR2b-c

## Delivery

- Strategy: feature-branch-chain.
- Boundary: `PR2b-b → PR2b-c`; Next notification item PATCH/DELETE Spring proxy, item contracts, and Chromium proof only.
- Excluded: collection changes, audit, settings, retention, and Prisma removal.
- Rollback: revert the item proxy, its contracts, the ephemeral E2E fixture, and task evidence as one slice.

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

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.4 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Spring-mode omission contract failed before the layout change | ✅ Focused layout contracts passed | ✅ Spring and legacy modes | ✅ Minimal root conditional |
| 3.5 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Browser contract extended before config change | ✅ Focused tests passed | ✅ `/admin` anonymous and authenticated routes | ✅ Dedicated matching server flags |
| 3.7–3.8 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Vitest unit | ✅ 14 Spring-session/proxy tests; ✅ 11 proxy-branch tests | ✅ Four new rotation/expiry assertions failed before forwarding | ✅ 29 focused tests passed | ✅ Authorized rotation and anonymous expiry preserve separate outcomes | ✅ Small typed response-cookie helper; forbidden/unavailable remain unchanged |
| 3.9 | `tests/e2e/auth-spring-session.spec.ts` | Chromium E2E | ✅ Earlier proof exposed an immediate cookie race and missing confirmation interaction | ✅ Hardened proof failed until it awaited `/admin`, dismisses the fixture onboarding, and confirms logout | ✅ Login, cookie persistence, direct `/admin`, logout expiry, anonymous redirect | ✅ Test-only stabilization; production forwarding unchanged |
| 3.12 | `src/lib/__tests__/adminNotificationByIdRoute.test.ts`, `tests/e2e/admin-notifications.spec.ts` | Vitest + Chromium | ✅ Legacy item-route test: 1/1 passed before replacement | ✅ Six Spring-proxy contracts were written first and failed while the legacy Prisma route loaded | ✅ 6/6 focused item contracts passed after the minimal proxy; PATCH and DELETE exercise distinct paths | ✅ Chromium used temporary PostgreSQL 16, Spring, and an ephemeral admin; persisted read state and deletion through browser-issued Next requests |
| 3.13 | `tasks.md`, this artifact | Evidence | N/A — documentation-only | N/A — no production behavior | N/A — records only executed evidence | ✅ Explicitly preserves the reconstructed-history limitation |

## Verification

- `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 29/29 passed.
- `cd backend && mvn test -Dtest=SessionServiceTest` — 9/9 passed.
- `npm run test:e2e:spring-auth` — isolated PostgreSQL + Spring + Next Chromium proof passed: login → `/admin` → confirmed logout.
- `npm run lint`, `npm run typecheck`, and `git diff --check` — passed.
- `npm run test:unit` — 81 files, 460 tests passed.
- `cd backend && mvn test -Dtest=NotificationControllerTest,NotificationServiceTest,AdminNotificationRepositoryIntegrationTest` — 10/10 passed.
- `npm run test:e2e:spring-auth` — temporary PostgreSQL 16 + Spring + Next Chromium proof passed (including item PATCH read-state persistence and DELETE removal).

## Evidence Constraint

Original migration RED history was not retained after reconstruction. The PR2b-c item-adapter RED→GREEN evidence above is executed in this worktree; it MUST NOT be generalized to pre-existing Spring notification or collection changes.

## Status

Tasks 3.12–3.13 are complete. The next work unit is PR2c audit, targeting PR2b-c. No collection, audit, settings, retention, or Prisma code was changed in this slice.
