# Apply Progress: Move Admin Operations and Remove Prisma — PR1c Flyway/Reconciliation Split Gate

## Delivery

- Strategy: feature-branch-chain.
- Work unit: PR1c — Flyway baseline adoption and AdminSettings reconciliation evidence.
- Boundary: `PR1b → PR1c`; admin adapters, retention/policy, Next BFF changes, and Prisma removal remain excluded.
- Review budget: the requested combined work is projected above the enforced 350-line planning budget and 400-line hard limit; no partial implementation was started.
- Rollback: no source changes to revert.

## Completed Tasks

- [x] PR1a 1.1 RED: session/authorization cases (previous batch)
- [x] PR1a 1.2a GREEN→REFACTOR: permission-authoritative session bridge (previous batch)
- [x] PR1a-fix 1.2b RED→GREEN: configured cookie clearing and logout response propagation (previous batch)
- [x] PR1b 1.3 RED→GREEN→REFACTOR: typed `authorized|anonymous|forbidden|unavailable` Spring BFF/proxy states.
- [ ] PR1c 1.4 RED / 1.5 GREEN→REFACTOR: blocked before RED because Flyway adoption and immutable reconciliation evidence cannot be delivered coherently within the approved PR1c line budget.

## PR1c Split Gate

- Existing `application.yml` still has `spring.jpa.hibernate.ddl-auto: update`; PR1c must switch this to validation while introducing Flyway.
- There are no Flyway dependencies, migration files, `AdminSettings` JPA model, reconciliation evidence models, or legacy-settings mappings in the backend.
- A coherent implementation needs at minimum: the Flyway dependency/configuration, a captured V1 schema baseline, V2 evidence tables, immutable evidence persistence, normalization/checksum/approval logic, and focused unit/integration tests. This materially exceeds the 350-line plan.
- Smallest safe split: **PR1c-a Flyway adoption** (dependency/configuration, captured V1 baseline, catalog-fingerprint preflight, adoption integration tests); then **PR1c-b reconciliation evidence** (V2 evidence tables, immutable models/service, normalization/verification/reset approval tests). PR1c-b must target PR1c-a.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `src/lib/__tests__/{springSession,proxyBranches,proxySpringSession}.test.ts` | Unit | ✅ 23/23 focused tests before corrective coverage | ✅ Original task RED was recorded in prior apply-progress; corrective tests cover already-green production behavior, so they passed immediately without production edits | ✅ 25/25 focused tests; 433/433 full suite | ✅ Authorized browser pass-through and 502 unavailable add distinct paths to the existing anonymous/403/unavailable coverage | ➖ None needed — test-only corrective retry |
| 1.4–1.5 | N/A | Unit + integration | ✅ `mvn test` baseline passed before planning | ➖ Blocked before RED — combined scope exceeds hard budget | ➖ Not started | ➖ Not started | ➖ Not started |

## Verification

- Focused: `npx vitest run src/lib/__tests__/springSession.test.ts src/lib/__tests__/proxyBranches.test.ts src/lib/__tests__/proxySpringSession.test.ts` — 25/25 passed.
- Full: `npm run test:unit` — 77 files, 433 tests passed.
- Quality: `npm run lint` and `npm run typecheck` — passed.
- `git diff --check` — passed.

## Status

PR1b remains complete. PR1c is blocked pending approval of the two-child split; no implementation, task checkbox, commit, or push was performed.
