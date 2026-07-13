# Design: Move Admin Operations and Remove Prisma

## Technical Approach

Expand/contract: establish Spring security/Flyway, migrate Next adapters, then remove Prisma after evidence gates. No fallback; slices are reversible.

## Architecture Decisions

| Option | Tradeoff | Decision / rationale |
|---|---|---|
| Role-name authorization | Stale/non-authoritative | Use permission authorities and `hasAuthority("admin:access")`; names are display-only. |
| Session-stored entity | Misses revoked access | Store `(userId, authorizationFingerprint)`; reload role/permissions per request. |
| Hibernate auto-DDL | Non-repeatable adoption | Flyway owns DDL; Hibernate validates. |
| Best-effort audit/CV cleanup | Loses evidence/races keys | Use transactional audit and leased exact-key cleanup. |

## SecurityContext and Error Flow

Order: `SecurityContextHolderFilter → SessionAuthenticationFilter → AnonymousAuthenticationFilter → ExceptionTranslationFilter → AuthorizationFilter`; register the filter after holder and before anonymous. It creates an empty context, reads `SESSIONID` without creating a session, reloads enabled `Usuario`→role→permissions, verifies the stored fingerprint, and installs permission-name authorities. Invalid identity/user/role/fingerprint invalidates the session, expires the cookie, and stays anonymous; `finally` clears the holder.

JSON handlers return 401/403. `getSpringSession()` returns `authorized|anonymous|forbidden|unavailable`: `/admin/**` redirects only anonymous, returns 403 without `admin:access`, and 503 for unavailable/malformed Spring. Adapters preserve 401/403; transport/unconfigured Spring is 503.

## Reconciliation and Flyway

Immutable run/item/approval tables snapshot canonical `AdminSettings`, `User`, and `Usuario` JSON, IDs, values, SHA-256 hashes, and catalog fingerprint. Email is NFKC→trim→locale-independent lowercase; empty/aliases are rejected. Equality only proposes a candidate. `MATCHED` binds IDs, email, hashes, verifier/time, and checksum; `RESET_APPROVED` adds product approver, reason, and defaults. Other/changed evidence blocks contract.

Sequence: fingerprint+backup; approved matching non-empty databases baseline at `1` (drift fails); `V1` creates empty databases; `V2+` adds nullable FK/evidence, snapshots/approves/backfills, verifies one-to-one parity, constrains, and cuts over. Checksum approval+backup permits legacy drop. Set `baseline-on-migrate=false`, `ddl-auto:validate` before V2.

## Audit Inventory and Durability

| Existing Next source | Calls | Spring catalog/outcomes |
|---|---:|---|
| `api/vacancies/route.ts` POST | 3 | `vacancy.create` D/S/E |
| `api/vacancies/[id]/route.ts` PUT/PATCH/DELETE | 7 | `vacancy.update` D/E; `update|activate|deactivate|close` S; close D/S/E |
| `api/contacts/[id]/route.ts` PATCH/DELETE | 6 | `contact.update_status|delete` D/S/E |
| `api/applications/[id]/route.ts` GET/PATCH/DELETE | 8 | `application.view|update_status|delete` D/S/E |
| `api/admin/candidates{,/[id]}/route.ts` | 5 | `candidate.create|update` D/S/E |

All 29 calls move to Spring; add missing `candidate.create` DENIED and `application.view` ERROR. Actor comes from `SecurityContext`; proxy metadata is allowlisted. Mutation+SUCCESS are atomic; read audit failure returns 500. Handlers/advice persist DENIED/ERROR with `REQUIRES_NEW`; failure preserves status and alerts.

## Retention Contracts

CV state: `PENDING → LEASED → SUCCEEDED|SUPERSEDED|RETRY_WAIT|FAILED`; due/expired work is reclaimable. Unique `(candidateId,expectedResumeKey)` captures the key. Atomically lease, delete that key (`not found` succeeds), then clear metadata with `WHERE id=? AND resume_key=?`; zero rows means superseded. Retryable errors back off; attempt 5/non-retryable fails. Dry-run does not mutate.

Audit purge preserves DENIED/ERROR and `auth.*`/`security.*` for 180 days, others for 90. Per-class transactional `DELETE ... IN (SELECT ... FOR UPDATE SKIP LOCKED)` uses its cutoff, preventing concurrent misclassification/double counts.

## Route-Level Browser Parity Matrix

| Next routes | Required parity |
|---|---|
| `/api/admin/notifications`, `/[id]` | pagination/DTOs, 201, 400/404, delete envelopes |
| `/api/admin/audit`, `/settings` | filters/order/dates; profile/preferences/backend shape |
| `/api/vacancies{,/[id]}`, `/api/contacts{,/[id]}`, `/api/admin/candidates{,/[id]}`, `/api/applications{,/[id]}`, `/api/uploadthing` | methods, CSRF/origin/policy, DTO/status/error envelopes, audits |
| `/api/admin/candidates/export` | `search`, existing CSV bytes/headers |
| `/api/applications/export` | filters/sort validation, exact 400, CSV headers |
| `/api/health` | 200/503 `{status,database}`, always `Cache-Control: no-store` |

## Files and Testing

Create the Spring session filter, admin/retention/policy models, services, controllers, and `backend/src/main/resources/db/migration/*.sql`. Modify `SecurityConfig.java`, `SessionService.java`, `AuthController.java`, `application.yml`, `backend/pom.xml`, matrixed routes, `src/proxy.ts`, `src/lib/springSession.ts`, and gateways. Cleanup archives `docs/archive/prisma/**`, deletes Prisma runtime/helpers/scripts/tests, and updates packages, CI, env, and docs.

Strict TDD: JUnit/MockMvc/PostgreSQL covers security, transactions, reconciliation, leases, retention; Vitest covers adapters and verifier fixtures (case, path, manifest, lockfile, exclusions); Playwright runs the Next+Spring matrix.

## Executable Decommission Gate

The exact portable command uses the repository's Node `>=20.19.0` contract:

```sh
npm run verify:orm-removal
```

`package.json` maps it to `node scripts/verify-orm-removal.mjs`. The Node script runs `spawnSync("git", ["ls-files", "-z"])`, NUL-splits paths, excludes only `docs/archive/` and `openspec/`, then fails on:

1. any pathname containing case-insensitive `prisma`, including `prisma.config.ts`, `src/lib/prisma.ts`, `src/lib/prismaError.ts`, directories, and equivalents;
2. any tracked file bytes containing case-insensitive `prisma`, or an unreadable/missing file;
3. `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, or `@types/pg` in any package dependency section;
4. any corresponding `package-lock.json` root dependency, `packages["node_modules/<name>"]`, or legacy `dependencies[name]` record.

The script constructs the token from fragments to avoid self-match, reports all offenders, and fails closed. A required `orm-removal` CI job runs after checkout/Node setup; `CI Success` includes it in `needs` and its success predicate. Failure blocks decommission merge and legacy deletion. Archive copy precedes cleanup; only the two excluded trees retain history.

## Migration / Rollout

Rollback slices: (1) Flyway/evidence; (2) session; (3) audit; (4) admin/health; (5) mutation audit; (6) exports/adapters; (7) audit retention; (8) CV; (9) policy; (10) archive/gate; (11) dependency/config removal; (12) approved legacy drop. Revert the active slice; slice 12 restores snapshot/deployment.

## Open Questions

- Before apply, select Feature Branch Chain or stacked PRs.
