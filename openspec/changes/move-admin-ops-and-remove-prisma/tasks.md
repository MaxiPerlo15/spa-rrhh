# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,550–4,650 total; each child ≤400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery / chain | ask-on-risk / feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1a–1c-e | Completed foundation | PR1a → PR1c-e | Approved immediate-parent commits. |
| 2a | Health ownership and Next adapter | PR2a | Base: PR1c-e; contracts; rollback health. |
| 2a-fix | Same-origin Spring auth relay | PR2a-fix | Base: PR2a; TDD/cookie handoff; rollback relay. |
| 2b | Notifications ownership and adapters | PR2b | Base: PR2a-fix; rebase before review; rollback notifications. |
| 2c | Audit ownership and adapter | PR2c | Base: PR2b; contracts; rollback audit. |
| 2d | Settings ownership and adapter | PR2d | Base: PR2c; contracts; rollback settings. |

`feature/tracker → PR1a → PR1a-fix → PR1b → PR1c-a → PR1c-b → PR1c-c → PR1c-d → PR1c-e → PR2a → 📍 PR2a-fix → PR2b → PR2c → PR2d`. Each child targets its immediate parent; rebase PR2b onto PR2a-fix before review and retarget polluted diffs.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1–2.5 **PR1c-a→e** Flyway baseline, adoption, evidence, approvals, and verified backfill/parity. Each merged as a ≤400-line immediate-parent slice with its rollback.

## Phase 3: Admin Ownership

- [x] 3.1 **PR2a RED→GREEN→REFACTOR** Spring DB health and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`. Rollback health only.
- [ ] 3.2 **PR2a-fix RED** Add failing Vitest contracts for `src/app/api/auth/spring/{login,logout}/route.ts`: same-origin credentials relay, Spring status/error mapping, request-cookie forwarding on logout, and no credential/error-body leakage.
- [ ] 3.3 **PR2a-fix GREEN→REFACTOR** Implement those routes with `src/lib/server/springBackend.ts`; forward Spring `Set-Cookie` (including logout expiry) on the Next response so `/admin` receives `SESSIONID`; update `src/app/admin/signin/page.tsx` and `src/app/admin/page.tsx` to call only same-origin relays. Preserve legacy NextAuth mode. Rollback relay/UI only; **≤400**.
- [ ] 3.4 **PR2a-fix verify** Add `tests/e2e/auth-spring-session.spec.ts` login/logout/cookie handoff and `/admin` proxy assertions; run focused Vitest/Playwright, lint, typecheck. Rebase PR2b onto PR2a-fix before review; **≤400**.
- [ ] 3.5 **PR2b RED→GREEN→REFACTOR** Test Spring notification ownership and both `src/app/api/admin/notifications/{route.ts,[id]/route.ts}` adapters; preserve pagination, DTOs, 201, 400/404/envelopes and 401/403/503. Depends PR2a-fix; rollback notifications only. Run focused JUnit/Vitest plus browser contract; **≤400**.
- [ ] 3.6 **PR2c RED→GREEN→REFACTOR** Test Spring audit query ownership and `src/app/api/admin/audit/route.ts`; preserve filters, inclusive UTC bounds, descending `createdAt`, pagination and 401/403/503/500 envelopes. Depends PR2b; rollback audit only; **≤400**.
- [ ] 3.7 **PR2d RED→GREEN→REFACTOR** Test Spring settings GET/PATCH and `src/app/api/admin/settings/route.ts`; preserve profile/preferences/backend/`updatedAt` shape and 400/401/403/503/500 envelopes. Depends PR2c; rollback settings only; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5 immediate-parent slices: retention/policy, audit/export evidence, archive/verifier/CI and Prisma removal only after checksum, parity, smoke gates; tests/rollback, **≤400**.
