# Apply Progress: Move Admin Operations and Remove Prisma — PR2a-fix-a2/b and PR2b

## Delivery

- Strategy: feature-branch-chain.
- Boundary: `PR2a-fix-a → PR2a-fix-a2 → PR2a-fix-b → PR2b`; PR2b contains notification Spring ownership, Next adapters, tests, fixture, and task evidence only.
- Excluded from PR2b: dashboard relocation, audit, settings, retention, and Prisma decommission.
- Review budget: approved notification `size:exception`; 1,072 changed lines (757 additions, 315 deletions). Reducing it would remove required adapter, persistence, fixture, or task evidence.
- Rollback: revert the notification controller/service/repository, Next notification adapters, notification tests/fixture, and task evidence as one slice.

## Completed Tasks

- [x] 2.1–2.5 reconciliation/Flyway chain (previous batches).
- [x] 3.1 Spring health ownership (previous batch).
- [x] 3.4 PR2a-fix-a2 RED: layout and Chromium relay contracts cover Spring-mode provider omission, `/admin`, and same-origin login.
- [x] 3.5 PR2a-fix-a2 GREEN→REFACTOR: gate global NextAuth/Sentry providers in Spring mode and align Playwright server flags.
- [x] 3.6 PR2a-fix-a2 verify: focused runtime browser proof, lint, and typecheck pass.
- [x] 3.7 PR2a-fix-b RED: focused Vitest contracts fail until Spring validation `Set-Cookie` reaches the session state and proxy response.
- [x] 3.8 PR2a-fix-b GREEN→REFACTOR: preserve the raw Spring `Set-Cookie` for authorized rotation and anonymous expiry only; harden the temporary browser cookie/logout proof.
- [x] 3.9 PR2a-fix-b verify: focused JUnit/Vitest, Chromium proof, lint, typecheck, and whitespace check pass.
- [x] 3.10 PR2b notification ownership/adapters: Spring CRUD and bulk-delete validation; Next Spring-only adapters; notification fixture; focused/full tests and Spring Chromium logout proof pass.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.4 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Spring-mode omission contract failed before the layout change | ✅ Focused layout contracts passed | ✅ Spring and legacy modes | ✅ Minimal root conditional |
| 3.5 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Browser contract extended before config change | ✅ Focused tests passed | ✅ `/admin` anonymous and authenticated routes | ✅ Dedicated matching server flags |
| 3.7–3.8 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Vitest unit | ✅ 14 Spring-session/proxy tests; ✅ 11 proxy-branch tests | ✅ Four new rotation/expiry assertions failed before forwarding | ✅ 29 focused tests passed | ✅ Authorized rotation and anonymous expiry preserve separate outcomes | ✅ Small typed response-cookie helper; forbidden/unavailable remain unchanged |
| 3.9 | `tests/e2e/auth-spring-session.spec.ts` | Chromium E2E | ✅ Earlier proof exposed an immediate cookie race and missing confirmation interaction | ✅ Hardened proof failed until it awaited `/admin`, dismisses the fixture onboarding, and confirms logout | ✅ Login, cookie persistence, direct `/admin`, logout expiry, anonymous redirect | ✅ Test-only stabilization; production forwarding unchanged |
| 3.10 repair | `backend/src/test/java/com/meinardi/rrhh/presentation/NotificationControllerTest.java` | MockMvc | ✅ 15 focused Next + 3 focused Spring notification tests passed before the repair | ✅ `DELETE ?view=unread` returned 200 before the controller validation | ✅ 5 focused Spring notification tests passed after allowing only `all`/`read` | ✅ `unread` and `archived` both return 400 and never invoke deletion; no further refactor needed |

## Verification

- `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 29/29 passed.
- `cd backend && mvn test -Dtest=SessionServiceTest` — 9/9 passed.
- `npm run test:e2e:spring-auth` — isolated PostgreSQL + Spring + Next Chromium proof passed: login → `/admin` → confirmed logout.
- `npm run lint`, `npm run typecheck`, and `git diff --check` — passed.
- `npm run test:unit` — 459/459 passed; `cd backend && mvn test` — 229/229 passed.
- `npm run test:e2e:spring-auth` — isolated PostgreSQL + Spring + Next Chromium login → `/admin` → same-origin `POST /api/auth/spring/logout` passed.

## Status

Tasks 3.4–3.10 are complete. PR2b is rebased to lifecycle tip `be5e0a9` and excludes dashboard relocation/audit/settings.

## TDD Evidence Note

The reconstructed pre-existing notification migration did not retain its original RED command history, so this artifact does not claim it. The recorded 3.10 repair cycle is complete and reproducible: the invalid bulk-delete tests were added before controller validation, failed at 200, then passed at 400 without a service call. Existing adapter/persistence/browser coverage was retained and re-executed as the safety net.
