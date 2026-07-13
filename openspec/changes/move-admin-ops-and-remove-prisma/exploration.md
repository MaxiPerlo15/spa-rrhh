## Exploration: Move Admin Ops and Remove Prisma

### Current State
JPA is the accepted canonical ORM, but Prisma still owns the final operational data path. Notifications, audit queries/writes, settings, audit retention, CV retention, application export, and health all access Prisma directly. `AdminAuditLog`, `AdminNotification`, and `AdminSettings` exist only in `prisma/schema.prisma`; Spring has no entities, controllers, jobs, or security rules for them.

Core business data has been cut over to Spring for vacancies, applications, contacts, and candidate writes. However, migrated Next adapters still call `auditAdminAction()`, which writes to Prisma, and public form rate-limit/captcha policy remains in Next. The final change must therefore remove both direct database access and these cross-cutting Prisma dependencies.

The active Spring security model has a prerequisite gap: `/api/v1/auth/me` manually validates `SESSIONID`, but `SecurityConfig` has no filter that converts that session into a Spring Security `Authentication`. A new `/api/v1/admin/**` route protected by `hasRole("ADMIN")` would otherwise be denied. Existing Next API routes also use `auth()` even though Credentials providers are disabled in Spring-auth mode.

### Affected Areas
- `src/app/api/admin/notifications/**`, `src/app/api/admin/audit/route.ts`, `src/app/api/admin/settings/route.ts` — Prisma-backed admin CRUD, query filters, schema-drift fallbacks, and settings upsert.
- `src/lib/adminAudit.ts`, `src/lib/auditRetention.ts`, `src/lib/auditRetentionPolicy.ts` — Prisma raw audit insert, Prisma delete job, and ORM enum coupling used across migrated adapters.
- `src/app/api/internal/**`, `src/lib/cvRetention.ts`, `scripts/purge-*.mjs` — Next-hosted, secret-triggered retention endpoints and scripts; CV cleanup queries/updates Prisma candidates.
- `src/app/api/applications/export/route.ts`, `src/app/api/health/route.ts` — the two remaining non-admin production Prisma reads.
- `src/lib/dto/adminNotification.ts`, `src/lib/dto/vacancy.ts`, `src/lib/prismaError.ts` — generated Prisma type/error dependencies that block package removal.
- `src/lib/publicRequestGuard.ts`, `src/lib/rateLimit.ts`, `src/lib/botProtection.ts`, `src/app/api/uploadthing/core.ts` — public rate-limit/captcha policy remains in Next although the roadmap assigns it to Spring.
- `src/lib/auth.ts`, `src/proxy.ts`, `backend/.../SecurityConfig.java`, `backend/.../application/SessionService.java` — admin adapter authorization must become Spring-session-aware before migrated admin routes are usable without NextAuth sessions.
- `backend/.../domain/model/PrismaUser.java`, `backend/.../infrastructure/PrismaUserRepository.java` — unused JPA mapping to the legacy Prisma `"User"` table; remove only after one-time settings/user-reference migration is verified.
- `prisma/`, `src/lib/prisma.ts`, `scripts/{create-admin,verify-admin,normalize-locations}.ts`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `src/lib/checkEnv.ts`, `.env.example` — Prisma runtime, CLI, direct PostgreSQL client usage, CI/bootstrap, and environment contract.
- Prisma-mocking unit tests, Prisma-focused tests, README/AGENTS/CI/security/deployment docs, and historical migrations — tests must move to Spring gateway/contract tests; schema and migrations must be archived, not silently discarded.

### Approaches
1. **Single cutover and package deletion** — implement all Spring admin APIs/jobs and delete Prisma in one PR.
   - Pros: shortest hybrid period; one final cleanup.
   - Cons: combines security, data migration, scheduling, external storage, CI, and frontend adapters; exceeds the 400-line review budget and makes rollback unsafe.
   - Effort: High.

2. **Chained expand/contract migration** — establish Spring ownership first, cut Next to thin adapters, then delete Prisma only after explicit no-reference checks.
   - Pros: preserves stable browser routes, isolates rollback, permits data reconciliation before destructive cleanup, and keeps review slices coherent.
   - Cons: requires temporary dual schema awareness and several PRs.
   - Effort: High.

### Recommendation
Use **Approach 2**. The final boundary is:

- **Spring owns** `AdminNotification`, `AdminAuditLog`, and `AdminSettings`; audit event creation and retention; CV-retention selection/metadata cleanup; scheduler execution; application-export data retrieval; DB health; and public form rate-limit/captcha policy.
- **Next remains only a BFF/UI transport**: preserve current `/api/**` browser contracts, CSRF/CORS/CSP edge controls, CSV rendering, and UploadThing transport. For public forms/upload middleware, Next forwards the request context and captcha token to a Spring authorization/policy endpoint; it retains no rate-limit or captcha decision logic. For admin routes, it forwards the Spring `SESSIONID` and uses a single Spring-session-aware authorization helper rather than NextAuth `auth()`.
- **Do not delete legacy data blindly.** Map `AdminNotification` and audit rows through JPA using string IDs. Migrate `AdminSettings` from the dormant Prisma `User` relationship to `Usuario` by verified email mapping (or explicitly reset preferences only with product approval). Remove `PrismaUser` and the old `"User"` table only after that reconciliation succeeds.

Recommended removal sequence:
1. Add Spring session-to-SecurityContext authentication, admin entities/repositories/services/controllers, stable DTO/error contracts, and migration/reconciliation checks. Add Spring-side audit creation so domain mutations can record actor/context transactionally.
2. Replace notifications, audit, settings, application export, and health with Spring-backed adapters. Remove schema-drift and Prisma-error fallbacks; keep response shapes stable. Migrate all audit call sites to Spring rather than retaining `auditAdminAction()`.
3. Move audit/CV retention to Spring scheduled jobs (with protected manual trigger only if operations require it). Move public submission/upload authorization policy to Spring; remove the Next internal retention endpoints, cron scripts, and Next-owned policy implementations.
4. Run production-like reconciliation and smoke checks: migrated settings counts, audit/notification reads, retention dry run, public-form rejection behavior, admin session authorization, export parity, and `/api/health` behavior against Spring.
5. Delete `src/lib/prisma.ts`, Prisma routes/helpers/types/tests, direct `pg` scripts, Prisma CLI scripts/config/dependencies, CI Prisma steps, and Next `DATABASE_URL` validation. Regenerate the lockfile, archive `prisma/schema.prisma` and migrations under `docs/archive/`, and update bootstrap/CI/env documentation.

Delivery forecast: **400-line budget risk: High. Chained PRs recommended: Yes. Decision needed before apply: Yes.** A practical chain is (1) Spring admin/session/audit foundation, (2) Next adapters and audit cutover, (3) retention plus public-policy cutover, and (4) Prisma/config/CI/archive deletion.

### Risks
- The existing Spring session is not installed in Spring Security, so role-protected admin endpoints will fail until a session authentication bridge is added and tested.
- Prisma and JPA tables remain separate legacy schemas; `AdminSettings.userId` requires verified identity mapping before the old `User` table can disappear.
- Audit is currently best-effort and outside domain transactions. Moving it must preserve failure semantics while preventing silent loss of security events.
- CV retention couples database selection to UploadThing deletion. Make remote deletion idempotent and retain retry/error reporting before removing the current job.
- Removing `DATABASE_URL` changes startup, CI, health, test fixtures, scripts, and documentation simultaneously; deletion must be gated by a repository-wide no-Prisma reference check.

### Ready for Proposal
Yes — propose a chained, expand/contract change with an explicit settings reconciliation plan and Spring-session SecurityContext foundation as mandatory first scope.
