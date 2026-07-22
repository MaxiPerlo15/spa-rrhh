# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,750–4,950; each child ≤400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery / chain | ask-on-risk resolved / feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1a–1c-e | Completed foundation | PR1a → PR1c-e | Immediate-parent commits. |
| 2a | Health ownership and Next adapter | PR2a | Base: PR1c-e; contracts. |
| 2a-fix-a | Relay/auth-mode boundary | PR2a-fix-a | Base: PR2a; relay/UI rollback. |
| 2a-fix-a2 | Parent-boundary auth-mode correction | PR2a-fix-a2 | Base: PR2a-fix-a; providers/server-env/browser relay proof; ≤400. |
| 2a-fix-b | Session lifecycle and browser proof | PR2a-fix-b | Base: PR2a-fix-a2; lifecycle/E2E RED→GREEN→REFACTOR; rollback forwarding/tests only. |
| 2b-a | Spring notification API, persistence, and tests | PR2b-a | Base: PR2a-fix-b; ~297 lines. |
| 2b-b | Next notification collection adapter and tests | PR2b-b | Base: PR2b-a branch; ~379 lines. |
| 2b-c | Next notification item adapter, Chromium E2E, evidence | PR2b-c | Base: PR2b-b branch; ~396 lines. |
| 2c | Audit ownership/adapter | PR2c | Base: PR2b-c branch; contracts. |
| 2d | Settings ownership/adapter | PR2d | Base: PR2c; contracts. |

`feature/tracker → … → PR2a → PR2a-fix-a → 📍 PR2a-fix-a2 → PR2a-fix-b → PR2b-a → PR2b-b → PR2b-c → PR2c → PR2d`. Target the immediate parent; rebase each child before review.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1–2.5 **PR1c-a→e** Flyway baseline, adoption, evidence, approvals, and verified backfill/parity; each ≤400 with rollback.

## Phase 3: Admin Ownership

- [x] 3.1 **PR2a RED→GREEN→REFACTOR** Spring health and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`.
- [x] 3.2 **PR2a-fix-a RED** Vitest contracts for `src/app/api/auth/spring/{login,logout}/route.ts`: relay, logout cookies, redaction, and auth mode.
- [x] 3.3 **PR2a-fix-a GREEN→REFACTOR** Use `src/lib/server/springBackend.ts`; align `src/lib/checkEnv.ts` and admin props; forward relay cookies only; **≤400**.
- [x] 3.4 **PR2a-fix-a2 RED** Add `src/app/__tests__/layout.test.tsx` and `tests/e2e/auth-spring-session.spec.ts` contracts: Spring mode omits global `SessionProvider`/`SentryUserContext`, uses `/admin`, and submits only to the same-origin relay.
- [x] 3.5 **PR2a-fix-a2 GREEN→REFACTOR** Gate providers in `src/app/layout.tsx`; set Spring-matching server flags in `playwright.config.ts`; correct the Playwright `/admin` route and relay assertion. Preserve legacy mode; rollback layout/config/E2E only; **≤400**.
- [x] 3.6 **PR2a-fix-a2 verify** Run layout/Vitest and Chromium Spring relay proof, lint/typecheck; rebase PR2a-fix-b before its RED task.
- [x] 3.7 **PR2a-fix-b RED** Spring/JUnit and Vitest `src/proxy.ts`/`src/lib/springSession.ts` contracts: rotated/expired `SESSIONID` reaches Next. Depends PR2a-fix-a2.
- [x] 3.8 **PR2a-fix-b GREEN→REFACTOR** Forward rotation/stale expiry; harden `tests/e2e/auth-spring-session.spec.ts` cookie handoff and `/admin`. **≤400**.
- [x] 3.9 **PR2a-fix-b verify** Run focused JUnit, Vitest, Playwright, lint/typecheck; then rebase PR2b.
- [ ] 3.10 **PR2b-a** Add Spring notification entities/repository/service/controller and JUnit tests under `backend/src/**`: pagination/DTOs, create, errors; base PR2a-fix-b; **~297**.
- [ ] 3.11 **PR2b-b** Add `src/app/api/admin/notifications/route.ts` and Vitest contracts for GET/POST/bulk DELETE: preserve DTOs, 201, 400, 401/403/503; base PR2b-a; **~379**.
- [ ] 3.12 **PR2b-c** Add `src/app/api/admin/notifications/[id]/route.ts` PATCH/DELETE and `tests/e2e/admin-notifications.spec.ts` Chromium coverage; record only executed/reconstructed evidence; base PR2b-b; **~396**.
- [ ] 3.13 **PR2b-c evidence** State in task/verification evidence that original migration RED history was not retained after reconstruction; do not claim full Strict TDD for pre-existing notification changes.
- [ ] 3.14 **PR2c RED→GREEN→REFACTOR** Spring audit and `src/app/api/admin/audit/route.ts`: filters, UTC bounds, order, pagination, errors. Depends PR2b-c; **≤400**.
- [ ] 3.15 **PR2d RED→GREEN→REFACTOR** Spring settings and `src/app/api/admin/settings/route.ts`: shape and error envelopes. Depends PR2c; **≤400**.

### Notification Evidence Constraint

Original migration RED history was not retained after reconstruction. Preserve behavior with the listed tests, but do not claim full Strict TDD for pre-existing notification changes.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5: retention/policy, audit/export evidence, archive/verifier/CI, then Prisma removal only after checksum, parity, smoke gates; **≤400**.
