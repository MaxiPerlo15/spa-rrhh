# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,400–4,500 total; each child ≤400 |
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
| 1a–1b | Completed foundation | PR1a → PR1b | Approved commits. |
| 1c-a | V1 baseline + empty-DB proof | PR1c-a | Base: PR1b; ≤400 or stop for migration-only `size:exception`. |
| 1c-b | Existing-DB adoption/preflight | PR1c-b | Base: PR1c-a; ≤400. |
| 1c-c | Immutable evidence foundation | PR1c-c | Base: PR1c-b; ≤400. |
| 1c-d | Reconciliation decisions/approvals | PR1c-d | Base: PR1c-c; ≤400. |
| 1c-e | Verified backfill/contract gate | PR1c-e | Base: PR1c-d; ≤400. |
| 2a | Health ownership and Next adapter | PR2a | Base: PR1c-e; contracts; rollback health. |
| 2b | Notifications ownership and adapters | PR2b | Base: PR2a; contracts; rollback notifications. |
| 2c | Audit ownership and adapter | PR2c | Base: PR2b; contracts; rollback audit. |
| 2d | Settings ownership and adapter | PR2d | Base: PR2c; contracts; rollback settings. |

`feature/tracker → PR1a → PR1a-fix → PR1b → PR1c-a → PR1c-b → PR1c-c → PR1c-d → PR1c-e → 📍 PR2a → PR2b → PR2c → PR2d`. Each child targets its immediate parent; retarget/rebase polluted diffs.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1 **PR1c-a RED→GREEN** V1 Flyway empty-DB/validation test and migration. Depends PR1b; rollback V1; **≤400**.
- [x] 2.2 **PR1c-b RED→GREEN** Existing-DB preflight/drift test and Flyway config. Depends PR1c-a; rollback config; **≤400**.
- [x] 2.3 **PR1c-c RED→GREEN** Immutable evidence test, V2 tables and hashes. Depends PR1c-b; rollback V2; **≤400**.
- [x] 2.4 **PR1c-d RED→GREEN** Reconciliation decision/approval contract test and service. Depends PR1c-c; rollback service; **≤400**.
- [x] 2.5 **PR1c-e RED→GREEN** Approved backfill/parity PostgreSQL test and constraints. Depends PR1c-d; rollback migration; **≤400**.

## Phase 3: Admin Ownership

- [ ] 3.1 **PR2a RED→GREEN→REFACTOR** Test Spring DB health; add controller/service and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`. Depends PR1c-e; rollback health only. Run focused JUnit/Vitest, `npm run lint`, `npm run typecheck`; **≤400**.
- [ ] 3.2 **PR2b RED→GREEN→REFACTOR** Test Spring notification ownership and both `src/app/api/admin/notifications/{route.ts,[id]/route.ts}` adapters; preserve pagination, DTOs, 201, 400/404/envelopes and 401/403/503. Depends PR2a; rollback notifications only. Run focused JUnit/Vitest plus browser contract; **≤400**.
- [ ] 3.3 **PR2c RED→GREEN→REFACTOR** Test Spring audit query ownership and `src/app/api/admin/audit/route.ts`; preserve filters, inclusive UTC bounds, descending `createdAt`, pagination and 401/403/503/500 envelopes. Depends PR2b; rollback audit only. Run focused JUnit/Vitest plus browser contract; **≤400**.
- [ ] 3.4 **PR2d RED→GREEN→REFACTOR** Test Spring settings GET/PATCH and `src/app/api/admin/settings/route.ts`; preserve profile/preferences/backend/`updatedAt` shape and 400/401/403/503/500 envelopes. Depends PR2c; rollback settings only. Run focused JUnit/Vitest plus browser contract; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5 immediate-parent slices: retention/policy, audit/export evidence, archive/verifier/CI and Prisma removal only after checksum, parity, smoke gates; tests/rollback, **≤400**.
