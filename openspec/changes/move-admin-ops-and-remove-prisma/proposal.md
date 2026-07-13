# Proposal: Move Admin Operations and Remove Prisma

## Intent

Finish the Spring/JPA migration safely. Prisma still owns settings, notifications, audit, retention, export, and health.

## Scope

### In Scope
- Install `SESSIONID` into Spring `SecurityContext`; require `ADMIN` for `/api/v1/admin/**` before adapter migration.
- Reconcile `AdminSettings` to `Usuario` by verified email. Report unmatched/duplicate rows and block legacy-user deletion; resets need product approval.
- Move admin operations, retention, export, health, and public policy to Spring. Next remains the BFF and edge.
- Remove Prisma only after reconciliation, smoke checks, and a no-runtime-reference gate; archive its schema and migrations.

### Out of Scope
- Single destructive cutover, unverified deletion, or Prisma fallback for migrated routes.
- Browser API, CSV, or storage-provider changes.

## Capabilities

### New Capabilities
- `spring-admin-operations`: Notifications, audit, settings, and health.
- `spring-retention-and-public-policy`: Scheduled retention and public request decisions.
- `prisma-decommission`: Gated archival and runtime removal.

### Modified Capabilities
- `admin-session`, `admin-authorization`: SecurityContext and Spring-session authorization.
- `candidate-admin-operations`, `spring-admin-application-lifecycle`: Spring audit replaces Next Prisma audit.
- `candidate-export`: Spring data source; Next CSV rendering.

## Approach

Use chained expand/contract delivery: Spring becomes authoritative, Next delegates, then an isolated cleanup removes Prisma.

| Slice | Gate | Rollback |
|---|---|---|
| 1. Foundation | Bridge, admin contracts, settings report pass | Revert additions |
| 2. Admin | Admin adapters pass contracts | Revert adapters |
| 3. Operations | Retention/policy tests pass | Revert jobs and forwarding |
| 4. Contract | Reconciliation, smoke suite, no Prisma references | No deletion |
| 5. Decommission | Archive then remove Prisma, `pg`, scripts, CI/env | Restore archive and revert PR |

Each slice is ≤400 lines with its tests. Before apply, ask feature-chain vs. stacked PRs; do not merge decommission without its gates.

## Affected Areas

| Area | Impact |
|---|---|
| `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java`, `backend/src/main/java/com/meinardi/rrhh/application/SessionService.java` | Session authentication |
| `src/app/api/admin/**`, `src/lib/adminAudit.ts` | Adapters and audit |
| `prisma/`, `src/lib/prisma.ts`, CI/env/scripts | Final removal |

## Risks

| Risk | Mitigation |
|---|---|
| Session denial | SecurityContext role tests first |
| Settings identity loss | Reconciliation blocks deletion |
| Incorrect CV deletion | Idempotency, dry-run, retries |

## Rollback Plan

Revert the affected slice. Keep legacy tables and archives until decommission verification; never use an in-route Prisma fallback.

## Dependencies

- Spring session bridge and successful AdminSettings reconciliation.
- Explicit PR-strategy decision and decommission approval.

## Success Criteria

- [ ] `SESSIONID` authorizes admins; missing/non-admin sessions return 401/403.
- [ ] Reconciliation has no unresolved rows or approved exceptions.
- [ ] Admin, retention, policy, export, and health avoid Prisma runtime access.
- [ ] Final removal passes no-reference, CI, and production-like smoke gates.
