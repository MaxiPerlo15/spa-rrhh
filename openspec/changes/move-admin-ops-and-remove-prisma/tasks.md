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
| 2b | Notifications ownership/adapters | PR2b | Base: PR2a-fix-b; rebase before review. |
| 2c | Audit ownership/adapter | PR2c | Base: PR2b; contracts. |
| 2d | Settings ownership/adapter | PR2d | Base: PR2c; contracts. |

`feature/tracker → … → PR2a → PR2a-fix-a → 📍 PR2a-fix-a2 → PR2a-fix-b → PR2b → PR2c → PR2d`. Target the immediate parent; rebase PR2a-fix-b then PR2b.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1–2.5 **PR1c-a→e** Flyway baseline, adoption, evidence, approvals, and verified backfill/parity; each ≤400 with rollback.

## Phase 3: Admin Ownership

- [x] 3.1 **PR2a RED→GREEN→REFACTOR** Spring health and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`.
- [ ] 3.2 **PR2a-fix-a RED** Vitest contracts for `src/app/api/auth/spring/{login,logout}/route.ts`: relay, logout cookies, redaction, and auth mode.
- [ ] 3.3 **PR2a-fix-a GREEN→REFACTOR** Use `src/lib/server/springBackend.ts`; align `src/lib/checkEnv.ts` and admin props; forward relay cookies only; **≤400**.
- [ ] 3.4 **PR2a-fix-a2 RED** Add `src/app/__tests__/layout.test.tsx` and `tests/e2e/auth-spring-session.spec.ts` contracts: Spring mode omits global `SessionProvider`/`SentryUserContext`, uses `/admin`, and submits only to the same-origin relay.
- [ ] 3.5 **PR2a-fix-a2 GREEN→REFACTOR** Gate providers in `src/app/layout.tsx`; set Spring-matching server flags in `playwright.config.ts`; correct the Playwright `/admin` route and relay assertion. Preserve legacy mode; rollback layout/config/E2E only; **≤400**.
- [ ] 3.6 **PR2a-fix-a2 verify** Run layout/Vitest and Chromium Spring relay proof, lint/typecheck; rebase PR2a-fix-b before its RED task.
- [ ] 3.7 **PR2a-fix-b RED** Spring/JUnit and Vitest `src/proxy.ts`/`src/lib/springSession.ts` contracts: rotated/expired `SESSIONID` reaches Next. Depends PR2a-fix-a2.
- [ ] 3.8 **PR2a-fix-b GREEN→REFACTOR** Forward rotation/stale expiry; harden `tests/e2e/auth-spring-session.spec.ts` cookie handoff and `/admin`. **≤400**.
- [ ] 3.9 **PR2a-fix-b verify** Run focused JUnit, Vitest, Playwright, lint/typecheck; then rebase PR2b.
- [ ] 3.10 **PR2b RED→GREEN→REFACTOR** Spring and `src/app/api/admin/notifications/{route.ts,[id]/route.ts}`: pagination/DTOs, 201, 400/404, 401/403/503. Depends PR2a-fix-b; **≤400**.
- [ ] 3.11 **PR2c RED→GREEN→REFACTOR** Spring audit and `src/app/api/admin/audit/route.ts`: filters, UTC bounds, order, pagination, errors. Depends PR2b; **≤400**.
- [ ] 3.12 **PR2d RED→GREEN→REFACTOR** Spring settings and `src/app/api/admin/settings/route.ts`: shape and error envelopes. Depends PR2c; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5: retention/policy, audit/export evidence, archive/verifier/CI, then Prisma removal only after checksum, parity, smoke gates; **≤400**.
