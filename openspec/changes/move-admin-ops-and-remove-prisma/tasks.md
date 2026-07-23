# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 4,700–5,900; every child ≤400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk resolved |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Spring audit persistence/API | PR2c-a | Base PR2b-c; tests and rollback included. |
| 2 | Next audit adapter | PR2c-b | Base PR2c-a; adapter-only rollback. |
| 3 | Audit call-site cutover | PR2c-c→e | Immediate-parent domain slices. |
| 4 | Settings adapter | PR2d | Base PR2c-e. |

`feature/tracker → … → PR2b-c → PR2c-a → PR2c-b → PR2c-c → PR2c-d → PR2c-e → PR2d`. Every child targets its immediate parent; retarget/rebase polluted diffs before review.

## Phase 1: Prior Delivery Evidence

- [x] 1.1 PR1 foundation/Flyway and PR2a auth/health chain remain historical dependencies; do not reopen them in PR2c.
- [x] 1.2 PR2b-a Spring notifications landed with the approved 423-line exception; PR2b-b collection landed at 400 and PR2b-c item/Chromium at 386.
- [x] 1.3 Original notification migration RED history was not retained; only PR2b-c item's observed RED→GREEN is claimed.

## Phase 2: Spring Audit Ownership (PR2c-a)

- [ ] 2.1 **RED** Add failing JUnit/MockMvc/PostgreSQL tests for `backend/src/**/audit/**`: immutable fields, UTC bounds, descending order, filters, pagination, 401/403/500.
- [ ] 2.2 **GREEN** Add Flyway audit schema plus Spring entity/repository/service/controller under `backend/src/**`; make SUCCESS atomic and DENIED/ERROR independently durable.
- [ ] 2.3 **REFACTOR/verify** Run focused tests; keep the slice ≤400. Rollback reverts only PR2c-a and leaves Next Prisma behavior intact.

## Phase 3: Next Adapter and Audit Call Sites

- [ ] 3.1 **PR2c-b RED** Add failing Vitest contracts for `src/app/api/admin/audit/route.ts`: filters/envelope, UTC dates, 400/401/403/503/500, and no Prisma fallback.
- [ ] 3.2 **PR2c-b GREEN→REFACTOR** Forward through `src/lib/server/springBackend.ts` while retaining `src/lib/apiValidation.ts` shape. Rollback adapter only; ≤400.
- [ ] 3.3 **PR2c-c RED→GREEN→REFACTOR** Cut over `src/app/api/vacancies/**` and `src/app/api/contacts/[id]/route.ts`; prove atomic SUCCESS and durable DENIED/ERROR. Base PR2c-b; rollback these call sites; ≤400.
- [ ] 3.4 **PR2c-d RED→GREEN→REFACTOR** Cut over `src/app/api/applications/[id]/route.ts`; prove `application.view` ERROR and mutation rollback. Base PR2c-c; ≤400.
- [ ] 3.5 **PR2c-e RED→GREEN→REFACTOR** Cut over `src/app/api/admin/candidates/**`; prove `candidate.create` DENIED/SUCCESS rollback; remove only migrated `src/lib/adminAudit.ts` uses. Base PR2c-d; ≤400.
- [ ] 3.6 Run focused JUnit/Vitest per slice, then audit Playwright, lint, and typecheck; record commands/results before rebasing PR2d.

## Phase 4: Follow-up

- [ ] 4.1 **PR2d** implement settings RED→GREEN→REFACTOR in `src/app/api/admin/settings/route.ts` after PR2c-e; preserve shape/errors; ≤400.
- [ ] 4.2 Keep Prisma removal gated behind reconciliation, parity, smoke, archive, and no-reference checks.

### Historical Evidence Constraint

No PR2c audit code, tests, or execution evidence exists yet. Record each new RED→GREEN→REFACTOR run when executed; never backfill historical evidence.
