# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 9 bounded slices, ~180–390 each |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 auth/dashboard (complete) → PR2 candidate export → PR3 applications export → PR4 detail/read routes → PR5 settings → PR6 CV retention → PR7 audit retention → PR8 public policy → PR9 ORM gate → PR10 reconciliation/decommission |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Preserve verified session/dashboard/logout slices | Complete | Existing focused Vitest + Spring-auth E2E evidence | `npm run test:e2e:spring-auth` | Auth BFF/session files only |
| 2–5 | Candidate/app export, remaining reads, settings parity | PR2–5 | Targeted Vitest/JUnit | Spring + disposable PostgreSQL + Next | Each route/gateway slice |
| 6–10 | Retention, policy, gate, cleanup | PR6–10 | Targeted JUnit/Vitest; gate command | Spring scheduler/policy harness; final smoke | Each service/gate/archive boundary |

## Phase 1: Verified Foundation

- [x] 1.1–1.4 Preserve `adminBffBoundary`, dashboard relays, auth/session gating, cookie relay, and logout expiry; evidence is recorded in `tasks.md` history and `apply-progress.md`.

## Phase 2: Admin Data and Read Parity

- [x] 2.1 **RED** Add Spring-session/query-parity contracts for `src/app/api/admin/candidates/export/route.ts`; **GREEN** proxy `search`, preserve CSV bytes/headers, 401/403/503, and remove Prisma/legacy auth; verify Vitest plus Spring query contracts.
- [x] 2.2 **RED** add invalid-filter/no-contact contracts for `src/app/api/applications/export/route.ts`; **GREEN** validate/forward filters and Spring CSV parity with exact 400/401/403/503/500 envelopes; verify focused Vitest and runtime export.
- [x] 2.3 **RED** add contracts for the bounded remaining detail/read slice (`vacancies/[id]` GET and `contacts/[id]` GET/PATCH/DELETE); **GREEN** migrate Spring-session forwarding, CSRF/origin, DTO/status/error and cookie parity without Prisma; verify focused Vitest. Candidate collection/detail handlers do not exist and application reads were already migrated.
- [x] 2.4 **RED** add settings route parity and 404 regression contracts; **GREEN** reconcile GET/PATCH wiring to Spring `Usuario`/`AdminSettings`, approval evidence, and response shape; verify adapter plus PostgreSQL reconciliation integration tests.

## Phase 3: Retention and Public Policy

- [x] 3.1 **RED** add CV lease/concurrency, exact-key, supersede, retry/five-attempt, expired-lease, absent-object, and dry-run tests; **GREEN** implement Spring work items/worker/Flyway transactionally; verify targeted JUnit/Testcontainers.
- [ ] 3.2 **RED** add classified audit purge tests for 180-day security/DENIED/ERROR versus 90-day ordinary events and concurrent workers; **GREEN** implement locked transactional purge; verify targeted JUnit/PostgreSQL.
- [ ] 3.3 **RED** add public form/upload policy forwarding and rejection-contract tests; **GREEN** move captcha/rate-limit decisions to Spring while preserving Next edge/context/browser behavior; verify Vitest and Spring policy runtime.

## Phase 4: Decommission and Final Reconciliation

- [ ] 4.1 **RED** add executable gate fixture tests for case-insensitive path/content, dependency/lockfile residue, malformed/unreadable files, and archive exclusions; **GREEN** add `scripts/verify-orm-removal.mjs`, package script, and required CI job; verify `npm run verify:orm-removal`.
- [ ] 4.2 **RED** add parent smoke/reconciliation blocker contracts; **GREEN** run checksum/parity, admin/policy/export/health smoke, archive Prisma immutably, remove runtime/helpers/scripts/dependencies/CI/env references, and re-run the gate; verify full gates before legacy drop.
