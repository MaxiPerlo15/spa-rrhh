# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,650–4,800 total; each child ≤400 |
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
| 1a–1c-e | Completed foundation | PR1a → PR1c-e | Approved immediate-parent commits. |
| 2a | Health ownership and Next adapter | PR2a | Base: PR1c-e; contracts; rollback health. |
| 2a-fix-a | Relay and auth-mode boundary | PR2a-fix-a | Base: PR2a; unit RED→GREEN→REFACTOR; rollback relay/UI only. |
| 2a-fix-b | Session lifecycle and browser proof | PR2a-fix-b | Base: PR2a-fix-a; lifecycle/E2E RED→GREEN→REFACTOR; rollback forwarding/tests only. |
| 2b | Notifications ownership and adapters | PR2b | Base: PR2a-fix-b; rebase before review; rollback notifications. |
| 2c | Audit ownership and adapter | PR2c | Base: PR2b; contracts; rollback audit. |
| 2d | Settings ownership and adapter | PR2d | Base: PR2c; contracts; rollback settings. |

`feature/tracker → … → PR2a → 📍 PR2a-fix-a → PR2a-fix-b → PR2b → PR2c → PR2d`. Target each immediate parent; rebase PR2a-fix-b and then PR2b before review.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1–2.5 **PR1c-a→e** Flyway baseline, adoption, evidence, approvals, and verified backfill/parity. Each merged as a ≤400-line immediate-parent slice with its rollback.

## Phase 3: Admin Ownership

- [x] 3.1 **PR2a RED→GREEN→REFACTOR** Spring DB health and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`. Rollback health only.
- [x] 3.2 **PR2a-fix-a RED** Add Vitest contracts for `src/app/api/auth/spring/{login,logout}/route.ts` and admin pages: same-origin relay, logout cookies, redaction, and legacy-vs-Spring mode.
- [x] 3.3 **PR2a-fix-a GREEN→REFACTOR** Implement via `src/lib/server/springBackend.ts`; make `src/lib/checkEnv.ts` and admin server/client props agree on Spring mode. Forward relay cookies only; rollback relay/UI/parity; **≤400**.
- [ ] 3.4 **PR2a-fix-b RED** Add Spring/JUnit validation expiry/rotation and Vitest `src/proxy.ts`/`src/lib/springSession.ts` forwarding contracts; assert rotated/expired `SESSIONID` reaches Next.
- [ ] 3.5 **PR2a-fix-b GREEN→REFACTOR** Forward validation rotation and stale expiry; harden `tests/e2e/auth-spring-session.spec.ts` for cookie handoff and successful `/admin` navigation. Rollback forwarding/E2E only; **≤400**.
- [ ] 3.6 **PR2a-fix-b verify** Run focused JUnit, Vitest, Playwright navigation proof, lint, and typecheck; then rebase PR2b onto PR2a-fix-b.
- [ ] 3.7 **PR2b RED→GREEN→REFACTOR** Test Spring notifications and `src/app/api/admin/notifications/{route.ts,[id]/route.ts}`: pagination/DTOs, 201, 400/404, 401/403/503. Depends PR2a-fix-b; rollback notifications; JUnit/Vitest/browser; **≤400**.
- [ ] 3.8 **PR2c RED→GREEN→REFACTOR** Test Spring audit and `src/app/api/admin/audit/route.ts`: filters, UTC bounds, descending `createdAt`, pagination, error envelopes. Depends PR2b; rollback audit; **≤400**.
- [ ] 3.9 **PR2d RED→GREEN→REFACTOR** Test Spring settings and `src/app/api/admin/settings/route.ts`: profile/preferences/backend/`updatedAt`, error envelopes. Depends PR2c; rollback settings; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5 immediate-parent slices: retention/policy, audit/export evidence, archive/verifier/CI and Prisma removal only after checksum, parity, smoke gates; tests/rollback, **≤400**.
