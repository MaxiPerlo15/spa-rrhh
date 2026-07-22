# Apply Progress: Move Admin Operations and Remove Prisma — PR2a-fix-a2/b

## Delivery

- Strategy: feature-branch-chain.
- Boundary: `PR2a-fix-a → PR2a-fix-a2 → PR2a-fix-b`; Spring authentication boundary, session lifecycle forwarding, and focused browser proof only.
- Excluded: notifications, audit, settings, retention, and Prisma removal.
- Review budget: 146 tracked changed lines before planning updates; within 400 lines.
- Rollback: revert the root provider boundary, session-cookie forwarding, and focused Spring auth tests as one slice.

## Completed Tasks

- [x] 2.1–2.5 reconciliation/Flyway chain (previous batches).
- [x] 3.1 Spring health ownership (previous batch).
- [x] 3.4 PR2a-fix-a2 RED: layout and Chromium relay contracts cover Spring-mode provider omission, `/admin`, and same-origin login.
- [x] 3.5 PR2a-fix-a2 GREEN→REFACTOR: gate global NextAuth/Sentry providers in Spring mode and align Playwright server flags.
- [x] 3.6 PR2a-fix-a2 verify: focused runtime browser proof, lint, and typecheck pass.
- [x] 3.7 PR2a-fix-b RED: focused Vitest contracts fail until Spring validation `Set-Cookie` reaches the session state and proxy response.
- [x] 3.8 PR2a-fix-b GREEN→REFACTOR: preserve the raw Spring `Set-Cookie` for authorized rotation and anonymous expiry only; harden the temporary browser cookie/logout proof.
- [x] 3.9 PR2a-fix-b verify: focused JUnit/Vitest, Chromium proof, lint, typecheck, and whitespace check pass.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.4 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Spring-mode omission contract failed before the layout change | ✅ Focused layout contracts passed | ✅ Spring and legacy modes | ✅ Minimal root conditional |
| 3.5 | `src/app/__tests__/layout.test.tsx`, `tests/e2e/auth-spring-session.spec.ts` | Vitest + Chromium | ✅ Prior batch | ✅ Browser contract extended before config change | ✅ Focused tests passed | ✅ `/admin` anonymous and authenticated routes | ✅ Dedicated matching server flags |
| 3.7–3.8 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Vitest unit | ✅ 14 Spring-session/proxy tests; ✅ 11 proxy-branch tests | ✅ Four new rotation/expiry assertions failed before forwarding | ✅ 29 focused tests passed | ✅ Authorized rotation and anonymous expiry preserve separate outcomes | ✅ Small typed response-cookie helper; forbidden/unavailable remain unchanged |
| 3.9 | `tests/e2e/auth-spring-session.spec.ts` | Chromium E2E | ✅ Earlier proof exposed an immediate cookie race and missing confirmation interaction | ✅ Hardened proof failed until it awaited `/admin`, dismisses the fixture onboarding, and confirms logout | ✅ Login, cookie persistence, direct `/admin`, logout expiry, anonymous redirect | ✅ Test-only stabilization; production forwarding unchanged |

## Verification

- `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 29/29 passed.
- `cd backend && mvn test -Dtest=SessionServiceTest` — 9/9 passed.
- `npm run test:e2e:spring-auth` — isolated PostgreSQL + Spring + Next Chromium proof passed: login → `/admin` → confirmed logout.
- `npm run lint`, `npm run typecheck`, and `git diff --check` — passed.

## Status

Tasks 3.4–3.9 are complete. The next work unit is PR2b notifications, which must target this immediate parent after rebase. No notifications, audit, or settings code was changed.
