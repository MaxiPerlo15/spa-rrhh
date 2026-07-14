# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 3,200–4,100 total; each PR1c child ≤400 |
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
| 2 | Admin ownership | PR2 | Base: PR1c-e; ≤400, then later slices use immediate parents. |

`feature/tracker → PR1a → PR1a-fix → PR1b → PR1c-a → 📍 PR1c-b → PR1c-c → PR1c-d → PR1c-e → PR2`. Retarget/rebase any child that shows parent work.

## Phase 2: Flyway and Reconciliation Chain

- [x] 2.1 **PR1c-a RED→GREEN** PostgreSQL RED: zero-to-V1, objects/history/checksum, Hibernate validate; GREEN Flyway PG/test support + only `backend/src/main/resources/db/migration/V1__*.sql`. Exclude adoption, cutover, V2+, reconciliation. Depends PR1b; rollback V1/support. Run `cd backend && mvn test -Dtest=FlywayEmptyDatabaseIntegrationTest` and `mvn test`. **≤400**; if atomic V1 + PostgreSQL test is >400, stop for migration-only `size:exception`—never compress DDL.
- [x] 2.2 **PR1c-b RED→GREEN** Test matching non-empty version-1 baselines and fail-closed drift; add fingerprint preflight, `baseline-on-migrate=false`, production `ddl-auto: validate`. Exclude evidence/reconciliation. Depends PR1c-a; rollback adoption/config. Run `cd backend && mvn test -Dtest=FlywayAdoptionIntegrationTest` and `mvn test`; **≤400**.
- [x] 2.3 **PR1c-c RED→GREEN** Test append-only persistence/immutability; add V2 expand-only run/item/approval tables, models/repos, canonical `AdminSettings`/`User`/`Usuario` JSON, IDs/values, SHA-256 hashes, fingerprint. Exclude decisions/approvals, backfill, constraints/cutover. Depends PR1c-b; rollback V2/evidence. Run `cd backend && mvn test -Dtest=ReconciliationEvidencePersistenceTest` and `mvn test`; **≤400**.
- [ ] 2.4 **PR1c-d RED→GREEN** Test NFKC/trim/locale-independent lowercase, empty/alias rejection, four outcomes, changed-checksum rejection; bind verifier/product approver, reason/defaults, time, hashes, IDs/email/checksum. Exclude contract schema, backfill, legacy deletion. Depends PR1c-c; rollback decision service. Run `cd backend && mvn test -Dtest=AdminSettingsReconciliationServiceTest` and `mvn test`; **≤400**.
- [ ] 2.5 **PR1c-e RED→GREEN** PostgreSQL test approved MATCHED/reset backfill, parity, unresolved blocking, checksum revalidation, unique/not-null/FK constraints; versioned migration/service flow. Exclude legacy drops and Next/admin adapters. Depends PR1c-d; rollback active migration/service, preserve evidence. Run `cd backend && mvn test -Dtest=ReconciliationBackfillIntegrationTest` and `mvn test`; **≤400**.

## Phase 3: Admin Ownership

- [ ] 3.1 **PR2 RED→GREEN** Contract-test notifications/audit/settings/health, 401/403/503/no-store; add Spring ownership and thin `src/app/api/admin/**`/`src/app/api/health/route.ts` adapters. Depends PR1c-e; rollback adapter/catalog. Run `npm run test:unit`, `npm run lint`, `npm run typecheck`, `cd backend && mvn test`; **≤400**.

## Phase 4: Remaining Contract and Decommission

- [ ] 4.1 PR3–PR5 immediate-parent slices: retention/policy, audit/export evidence, archive/verifier/CI and Prisma removal only after checksum, parity, smoke gates; tests/rollback, **≤400**.
