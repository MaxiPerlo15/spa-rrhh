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

- [x] 2.1 **PR1c-a RED→GREEN** PostgreSQL RED: zero-to-V1, objects/history/checksum, Hibernate validate; GREEN Flyway PG/test support + only `backend/src/main/resources/db/migration/V1__*.sql`. Exclude adoption, cutover, V2+, reconciliation. Depends PR1b; rollback V1/support. Run `cd backend && mvn test -Dtest=FlywayEmptyDatabaseIntegrationTest` and `mvn test`. **≤400**; if atomic V1 + PostgreSQL test is >400, stop for migration-only `size:exception`—never compress DDL.
- [x] 2.2 **PR1c-b RED→GREEN** Test matching non-empty version-1 baselines and fail-closed drift; add fingerprint preflight, `baseline-on-migrate=false`, production `ddl-auto: validate`. Exclude evidence/reconciliation. Depends PR1c-a; rollback adoption/config. Run `cd backend && mvn test -Dtest=FlywayAdoptionIntegrationTest` and `mvn test`; **≤400**.
- [x] 2.3 **PR1c-c RED→GREEN** Test append-only persistence/immutability; add V2 expand-only run/item/approval tables, models/repos, canonical `AdminSettings`/`User`/`Usuario` JSON, IDs/values, SHA-256 hashes, fingerprint. Exclude decisions/approvals, backfill, constraints/cutover. Depends PR1c-b; rollback V2/evidence. Run `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` and `mvn test`; **≤400**.
- [x] 2.4 **PR1c-d RED→GREEN** Test NFKC/trim/locale-independent lowercase, empty/alias rejection, four outcomes, changed-checksum rejection; bind verifier/product approver, reason/defaults, time, hashes, IDs/email/checksum. Exclude contract schema, backfill, legacy deletion. Depends PR1c-c; rollback decision service. Run `cd backend && mvn test -Dtest=AdminSettingsReconciliationServiceTest` and `mvn test`; **≤400**.
- [x] 2.5 **PR1c-e RED→GREEN** PostgreSQL test approved MATCHED/reset backfill, parity, unresolved blocking, checksum revalidation, unique/not-null/FK constraints; preserve V2/V3 checksums and derive immutable compatible run checksums from valid V3 approval evidence in forward V4 before V5 backfill. Exclude legacy drops and Next/admin adapters. Depends PR1c-d; rollback active migrations/service, preserve evidence. Run `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` and `mvn test`; **≤400**.

## Phase 3: Admin Ownership

- [x] 3.1 **PR2a RED→GREEN→REFACTOR** Test Spring DB health; add controller/service and thin `src/app/api/health/route.ts`; preserve 200/503 `{status,database}` and `Cache-Control: no-store`. Depends PR1c-e; rollback health only. Run focused JUnit/Vitest, `npm run lint`, `npm run typecheck`; **≤400**.
- [ ] 3.2 **PR2b RED→GREEN→REFACTOR** Test Spring notification ownership and both `src/app/api/admin/notifications/{route.ts,[id]/route.ts}` adapters; preserve pagination, DTOs, 201, 400/404/envelopes and 401/403/503. Depends PR2a; rollback notifications only. Run focused JUnit/Vitest plus browser contract; **≤400**.
- [ ] 3.3 **PR2c RED→GREEN→REFACTOR** Test Spring audit query ownership and `src/app/api/admin/audit/route.ts`; preserve filters, inclusive UTC bounds, descending `createdAt`, pagination and 401/403/503/500 envelopes. Depends PR2b; rollback audit only. Run focused JUnit/Vitest plus browser contract; **≤400**.
- [ ] 3.4 **PR2d RED→GREEN→REFACTOR** Test Spring settings GET/PATCH and `src/app/api/admin/settings/route.ts`; preserve profile/preferences/backend/`updatedAt` shape and 400/401/403/503/500 envelopes. Depends PR2c; rollback settings only. Run focused JUnit/Vitest plus browser contract; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5 immediate-parent slices: retention/policy, audit/export evidence, archive/verifier/CI and Prisma removal only after checksum, parity, smoke gates; tests/rollback, **≤400**.
