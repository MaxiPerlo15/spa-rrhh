# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 4,700–5,900; every committed child ≤400 |
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
| 5 | Remaining audit WIP | PR2c-f0 → PR2c-f2 | Foundation, vacancy-detail, then contact; each child targets its immediate parent. |

`feature/tracker → … → PR2b-c → PR2c-a → PR2c-b → PR2c-c → PR2c-d → PR2c-e → PR2d → PR2c-f0 → PR2c-f1 → PR2c-f2`. Every child targets its immediate parent; retarget/rebase polluted diffs before review. The PR2c-f aggregate is uncommitted WIP, not completed delivery.

## Phase 1: Prior Delivery Evidence

- [x] 1.1 PR1 foundation/Flyway and PR2a auth/health chain remain historical dependencies; do not reopen them in PR2c.
- [x] 1.2 PR2b-a Spring notifications landed with the approved 423-line exception; PR2b-b collection landed at 400 and PR2b-c item/Chromium at 386.
- [x] 1.3 Original notification migration RED history was not retained; only PR2b-c item's observed RED→GREEN is claimed.

## Phase 2: Spring Audit Ownership (PR2c-a)

- [x] 2.1 **RED** Add failing JUnit/MockMvc/PostgreSQL tests for `backend/src/**/audit/**`: immutable fields, UTC bounds, descending order, filters, pagination, 401/403/500.
- [x] 2.2 **GREEN** Add Flyway audit schema plus Spring entity/repository/service/controller under `backend/src/**`; make SUCCESS atomic and DENIED/ERROR independently durable.
- [x] 2.3 **REFACTOR/verify** Run focused tests; keep the slice ≤400. Rollback reverts only PR2c-a and leaves Next Prisma behavior intact.

## Phase 3: Next Adapter and Audit Call Sites

- [x] 3.1 **PR2c-b RED** Add failing Vitest contracts for `src/app/api/admin/audit/route.ts`: filters/envelope, UTC dates, 400/401/403/503/500, and no Prisma fallback.
- [x] 3.2 **PR2c-b GREEN→REFACTOR** Forward through `src/lib/server/springBackend.ts` while retaining `src/lib/apiValidation.ts` shape. Rollback adapter only; ≤400.
- [x] 3.3 **PR2c call-site chain** Cut over `src/app/api/vacancies/**` and `src/app/api/contacts/[id]/route.ts`; prove atomic SUCCESS and durable DENIED/ERROR. Completed by committed ancestry from `339603a` (PR2c-c) through `6c031c5` (PR2c-f2); rollback each call-site child independently; ≤400.
  - [x] 3.3a **PR2c-c call-site A** Cut over `POST /api/vacancies`: Spring-session actor forwarding and transactional `vacancy.create` SUCCESS/ERROR audit. Rollback reverts only the POST call site and `AuditedVacancyCreator`.
  - [x] 3.3b **PR2c-f remaining call sites** Complete the remaining vacancy-detail and contact call sites, including their DENIED paths. The previously uncommitted aggregate was delivered as the committed PR2c-f0 → PR2c-f2 ancestry ending at `6c031c5`.
    - [x] 3.3b.1 **PR2c-f0 foundation** Add `backend/src/main/**/AuditedAdminMutation.java` and its `AdminAuditLogRepositoryIntegrationTest` rollback/independent-ERROR proof. Committed at `bde3dfd`; no HTTP call-site cutover; base PR2d; ≤140.
    - [x] 3.3b.2 **PR2c-f1 vacancy detail** Change vacancy-only hunks in `SecurityConfig{,Test}.java`, `VacancyRestController.java`, and `VacancyExceptionHandlerTest.java`; migrate `src/app/api/vacancies/[id]/route.ts` with `vacancyDetailRoute.test.ts`. Delivered by committed descendants `badbe52` through `12c67cd` of PR2c-f0; ≤400.
    - [x] 3.3b.3 **PR2c-f2 contact** Change contact-only hunks in `SecurityConfig{,Test}.java` and `ContactoRestController.java`; migrate `src/app/api/contacts/[id]/route.ts` with `contactStatusRoute.test.ts`. Delivered by committed descendants `fbd4c9f` through `6c031c5` of PR2c-f1; ≤280.
- [x] 3.4 **PR2c-d RED→GREEN→REFACTOR** Cut over `src/app/api/applications/[id]/route.ts`; prove `application.view` ERROR and mutation rollback. Base PR2c-c; ≤400.
- [x] 3.5 **PR2c-e RED→GREEN→REFACTOR** Cut over `src/app/api/admin/candidates/**`; prove `candidate.create` DENIED/SUCCESS rollback; remove only migrated `src/lib/adminAudit.ts` uses. Base PR2c-d; ≤400.
- [x] 3.6 Run focused JUnit/Vitest per slice, then audit Playwright, lint, and typecheck; record commands/results before rebasing PR2d. PASS recorded in `verify-report-pr2c-final-validation.md` against committed PR2c-f2 head `6c031c5b854e917d2207adafc83fc4f48f3bc63b`.

## Phase 4: Follow-up

- [x] 4.1 **PR2d** implement settings RED→GREEN→REFACTOR in `src/app/api/admin/settings/route.ts` after PR2c-e; preserve shape/errors; ≤400.
- [ ] 4.2 Keep Prisma removal gated behind reconciliation, parity, smoke, archive, and no-reference checks.

### Historical Evidence Constraint

PR2c-a audit code, tests, and execution evidence are recorded above. Record each later PR2c slice's RED→GREEN→REFACTOR run when executed; never backfill historical evidence.
