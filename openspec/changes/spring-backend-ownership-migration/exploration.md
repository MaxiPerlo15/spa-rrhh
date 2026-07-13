## Exploration: Hybrid to Spring Backend Ownership Migration

### Current State
The repo is still a hybrid system. Spring Boot currently owns only vacancy lifecycle through `/api/v1/vacancies/**`, while Next.js still owns most backend behavior through `src/app/api/**`, Prisma persistence, NextAuth admin auth, operational cron endpoints, and admin workflows. Even when `BACKEND_URL` is enabled, Next keeps business logic such as Spring payload translation, fallback behavior, local vacancy shadow writes, audit logging, and application/contact/candidate persistence.

### Affected Areas
- `src/app/api/vacancies/route.ts` — hybrid vacancy ownership, Spring proxying, Prisma fallback, field translation
- `src/app/api/vacancies/[id]/route.ts` — vacancy updates/status changes split across Spring and Prisma
- `src/app/api/applications/route.ts` — application intake persists in Prisma while validating vacancies against Spring
- `src/app/api/applications/[id]/route.ts` — application status lifecycle still owned by Next + Prisma
- `src/app/api/contacts/route.ts` — contact intake and dedupe still owned by Next + Prisma
- `src/app/api/contacts/[id]/route.ts` — contact lifecycle still owned by Next + Prisma
- `src/app/api/admin/**` — admin candidates, notifications, settings, audit remain Prisma-backed backend behavior
- `src/app/api/auth/**` and `src/lib/auth.ts` — admin auth and password reset remain NextAuth/Prisma owned
- `src/app/api/internal/**` — retention jobs still execute inside Next runtime
- `src/lib/server/springBackend.ts` and `src/lib/server/applicationVacancyMetadata.ts` — Next owns Spring contract translation and fallback policy
- `prisma/schema.prisma` — current live data model for Next-owned backend behavior
- `backend/src/main/java/com/meinardi/rrhh/**` — Spring currently exposes vacancy APIs only, despite broader domain entities existing

### Executive Architecture Mismatch Summary
Target architecture says Next should be frontend-only and Spring should own backend logic. The codebase does not match that target yet. Spring is currently a vacancy service, while Next remains the real application backend for auth, applications, contacts, candidates, admin operations, audit, notifications, retention, uploads, and much of the integration logic.

### Numbered Issue List
1. **Vacancy ownership is still hybrid**
   - Why it matters: the one domain already split across Next and Spring still duplicates contract knowledge in Next, including status normalization, unsupported field checks, fallback policy, and cache invalidation.
   - Evidence files:
     - `src/app/api/vacancies/route.ts`
     - `src/app/api/vacancies/[id]/route.ts`
     - `src/lib/server/springBackend.ts`
     - `backend/src/main/java/com/meinardi/rrhh/presentation/VacancyRestController.java`
   - Suggested future SDD change boundary: `remove-vacancy-prisma-shadow-and-fallbacks`
   - Migration difficulty: M

2. **Applications use split source of truth**
   - Why it matters: application submission validates vacancy state through Spring, then persists candidate/application records in Prisma and even upserts a local vacancy shadow. This is the highest consistency-risk seam in the repo.
   - Evidence files:
     - `src/app/api/applications/route.ts`
     - `src/app/api/applications/[id]/route.ts`
     - `src/lib/server/applicationVacancyMetadata.ts`
     - `prisma/schema.prisma`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java`
   - Suggested future SDD change boundary: `move-application-intake-and-lifecycle-to-spring`
   - Migration difficulty: L

3. **Contacts and candidate workflows still live entirely in Next**
   - Why it matters: public contact intake, manual candidate creation, candidate updates, and exports are backend workflows but still execute inside the frontend app runtime.
   - Evidence files:
     - `src/app/api/contacts/route.ts`
     - `src/app/api/contacts/[id]/route.ts`
     - `src/app/api/admin/candidates/route.ts`
     - `src/app/api/admin/candidates/[id]/route.ts`
     - `src/app/api/admin/candidates/export/route.ts`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Contacto.java`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java`
   - Suggested future SDD change boundary: `move-contact-and-candidate-ops-to-spring`
   - Migration difficulty: L

4. **Auth ownership is incompatible with the target architecture**
   - Why it matters: admin identity is owned by NextAuth + Prisma, while Spring trusts only a shared internal header. That means Spring does not yet own user-level authorization or password lifecycle.
   - Evidence files:
     - `src/lib/auth.ts`
     - `src/app/api/auth/[...nextauth]/route.ts`
     - `src/app/api/auth/forgot-password/route.ts`
     - `src/app/api/auth/reset-password/route.ts`
     - `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java`
     - `backend/pom.xml`
   - Suggested future SDD change boundary: `unify-admin-auth-and-backend-trust`
   - Migration difficulty: L

5. **Schema and data model ownership are not aligned**
   - Why it matters: Prisma models and Spring JPA entities do not share the same table names, field names, or even some domain fields/statuses. Spring validates against a different schema shape than the one Next currently uses.
   - Evidence files:
     - `prisma/schema.prisma`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Vacante.java`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java`
     - `backend/src/main/java/com/meinardi/rrhh/domain/model/Usuario.java`
     - `backend/src/main/resources/application.yml`
   - Suggested future SDD change boundary: `align-spring-and-prisma-schema-strategy`
   - Migration difficulty: L

6. **Admin operations remain Prisma-only backend behavior**
   - Why it matters: notifications, audit logs, and admin settings are still application-backend features inside Next, including raw SQL audit writes and schema-drift fallbacks.
   - Evidence files:
     - `src/app/api/admin/notifications/route.ts`
     - `src/app/api/admin/notifications/[id]/route.ts`
     - `src/app/api/admin/settings/route.ts`
     - `src/app/api/admin/audit/route.ts`
     - `src/lib/adminAudit.ts`
     - `src/lib/prismaError.ts`
   - Suggested future SDD change boundary: `move-admin-ops-to-spring`
   - Migration difficulty: M

7. **Operational jobs and ingress policy still run in Next**
   - Why it matters: retention jobs, upload ingress policy, rate limiting, captcha enforcement, and public request guards are backend operational concerns that currently require the Next runtime to stay stateful and DB-aware.
   - Evidence files:
     - `src/app/api/internal/cv-retention/route.ts`
     - `src/app/api/internal/audit-retention/route.ts`
     - `src/lib/cvRetention.ts`
     - `src/lib/auditRetention.ts`
     - `src/lib/publicRequestGuard.ts`
     - `src/lib/rateLimit.ts`
     - `src/app/api/uploadthing/core.ts`
   - Suggested future SDD change boundary: `move-ops-jobs-and-ingress-policy-to-spring`
   - Migration difficulty: M

8. **Next runtime is still directly coupled to the database and production env**
   - Why it matters: a frontend-only Next deployment should not require direct database access for core runtime health and startup, but the current app still validates `DATABASE_URL`, uses Prisma for healthchecks, and fails startup when backend env is incomplete.
   - Evidence files:
     - `src/lib/prisma.ts`
     - `src/app/api/health/route.ts`
     - `src/lib/checkEnv.ts`
     - `src/instrumentation.ts`
   - Suggested future SDD change boundary: `decouple-next-runtime-from-direct-db-access`
   - Migration difficulty: M

9. **Fallbacks and drift handling can mask migration failures**
   - Why it matters: non-prod Prisma fallbacks and schema-drift fallbacks reduce immediate breakage, but they also hide whether Spring or the target schema are actually ready to own the domain.
   - Evidence files:
     - `src/lib/server/springBackend.ts`
     - `src/lib/server/applicationVacancyMetadata.ts`
     - `src/lib/prismaError.ts`
     - `src/app/api/admin/settings/route.ts`
     - `src/app/api/admin/notifications/route.ts`
     - `src/app/api/admin/audit/route.ts`
   - Suggested future SDD change boundary: `remove-migration-fallbacks-and-shadow-paths`
   - Migration difficulty: S

### Recommended Ordering for Tackling the Issues
1. **Unify auth and trust contract** — without this, Spring cannot become backend owner safely.
2. **Choose and execute schema strategy** — define the canonical DB ownership and migration path before moving more domains.
3. **Finish vacancy ownership migration** — remove hybrid behavior from the one domain already split.
4. **Move applications end-to-end** — highest split-brain risk after vacancies.
5. **Move contacts and candidate operations** — completes the intake/admin domain shift.
6. **Move admin operations** — notifications, audit, settings.
7. **Move ops jobs and ingress policy** — retention, upload/rate limit/captcha enforcement.
8. **Decouple Next runtime from direct DB/backend env coupling** — finalizes frontend-only deployment posture.
9. **Remove temporary fallbacks** — harden the target architecture once ownership is moved.

### Suggested `/sdd-new` Change Names
- `unify-admin-auth-and-backend-trust`
- `align-spring-and-prisma-schema-strategy`
- `remove-vacancy-prisma-shadow-and-fallbacks`
- `move-application-intake-and-lifecycle-to-spring`
- `move-contact-and-candidate-ops-to-spring`
- `move-admin-ops-to-spring`
- `move-ops-jobs-and-ingress-policy-to-spring`
- `decouple-next-runtime-from-direct-db-access`
- `remove-migration-fallbacks-and-shadow-paths`

### Approaches
1. **Domain-first migration without platform groundwork** — move vacancies, then applications, then other domains immediately.
   - Pros: visible business progress quickly
   - Cons: high risk of auth/schema rework across every domain slice
   - Effort: High

2. **Foundation-first, then domain slices** — first settle auth/trust and schema ownership, then migrate domain seams in sequence.
   - Pros: reduces rework, makes later domain changes cleaner, aligns with target architecture
   - Cons: less visible user-facing progress at the start
   - Effort: Medium

### Recommendation
Use the foundation-first path. Start with backend trust/auth and schema ownership, then finish the vacancy seam, and only after that move applications, contacts, candidates, and admin/ops concerns. That ordering minimizes split-brain persistence and prevents each domain migration from inventing its own temporary contract.

### Risks
- Schema migration may require a data backfill or dual-write window if Prisma and JPA cannot converge in-place.
- Auth migration can break admin access if Spring trust and Next session ownership are not transitioned together.
- Application/candidate migration carries the highest data-consistency risk because it currently spans Spring validation and Prisma writes.
- Temporary fallbacks may create false confidence in non-production if they are not removed deliberately.

### Ready for Proposal
Yes — start by drafting two proposal-sized changes first: `unify-admin-auth-and-backend-trust` and `align-spring-and-prisma-schema-strategy`. Those two decisions determine how safely the remaining domain migrations can be sliced.
