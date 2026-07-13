# Spring Backend Migration Roadmap

## Target Architecture
- **Next.js**: Frontend only (UI, SSR/RSC, client state, thin API wrappers)
- **Spring Boot**: Backend logic (auth, business rules, persistence, jobs, security)
- **JPA/Hibernate**: Canonical ORM (sole database access layer)
- **Prisma**: REMOVED completely after migration (historical reference only)

## Architecture Decision Record (ADR)

### ADR-001: JPA is the canonical ORM

**Status**: Accepted (2026-07-04)

**Context**: The project currently uses two ORMs — Prisma (Next.js) and JPA (Spring Boot). This creates split source of truth, schema drift, and dual-write complexity.

**Decision**: JPA/Hibernate is the sole ORM. Prisma is removed entirely after migration.

**Consequences**:
- `prisma/schema.prisma` → archived as historical reference
- `@prisma/client` → removed from `package.json`
- `@prisma/adapter-pg` → removed from `package.json`
- `src/lib/prisma.ts` → deleted
- `prisma/migrations/` → archived (read-only)
- `prisma/seed.ts` → deleted (Spring has its own seed)
- `npx prisma migrate dev` → no longer used
- `npx prisma generate` → no longer used
- `DATABASE_URL` → no longer required by Next.js

**Migration strategy**: Expand/contract per domain. During transition, Next.js delegates to Spring APIs. Prisma stays alive only until all domains are migrated, then removed in final cleanup.

## Current State (2026-07-05)
- Spring owns: auth + vacancy lifecycle (Prisma fallback removed)
- Next owns: applications, contacts, candidates, admin ops, jobs, security policy
- Hybrid hotspots: application submission (validates against Spring, persists in Prisma)
- Prisma: still active for non-vacancy domains (will be removed after full migration)

## Completed Changes
| Change | Status | Archive | Date |
|---|---|---|---|
| `unify-admin-auth-and-backend-trust` | ✅ Archived | `openspec/changes/archive/2026-07-04-unify-admin-auth-and-backend-trust/` | 2026-07-04 |
| `remove-vacancy-prisma-shadow-and-fallbacks` | ✅ Archived | `openspec/changes/archive/2026-07-05-remove-vacancy-prisma-shadow-and-fallbacks/` | 2026-07-05 |
| `simplify-spring-vacancy-contract` | ✅ Archived | `openspec/changes/archive/2026-07-05-simplify-spring-vacancy-contract/` | 2026-07-05 |

## 2-Week Sprint Plan

### Week 1: Foundation + Vacancies

#### Day 1–2: Schema Strategy (RFC) ✅ COMPLETED
- **Issue**: Align Prisma and JPA schema ownership
- **Deliverable**: RFC document deciding canonical DB strategy
- **Decision made**: JPA is canonical (English naming), Prisma is removed (see ADR-001)
- **Decisions made**:
  - Single database (same PostgreSQL)
  - English PascalCase naming for JPA tables
  - Expand/contract migration per domain
  - `salary`, `benefits`, `personKey` added to JPA
  - `AdminAuditLog`/`AdminNotification` migrated to JPA
- **SDD phase**: `sdd-explore` only (no full cycle)
- **Estimated**: 3–4h
- **Archive**: `openspec/plans/rfc-001-schema-strategy.md`

#### Day 2–3: Vacancies PR1 — Remove Prisma Shadow ✅ COMPLETED
- **Issue**: Eliminate hybrid vacancy ownership
- **Scope**:
  - Remove Prisma fallback from vacancy reads
  - Remove local vacancy shadow writes from application flow
  - Remove `canUsePrismaFallbackForSpringReads` usage
  - Remove `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR` env var
- **Files affected**: `src/app/api/vacancies/route.ts`, `src/app/api/vacancies/[id]/route.ts`, `src/lib/server/springBackend.ts`, `src/lib/server/applicationVacancyMetadata.ts`
- **SDD change name**: `remove-vacancy-prisma-shadow-and-fallbacks`
- **Estimated**: 6–8h
- **Archive**: `openspec/changes/archive/2026-07-05-remove-vacancy-prisma-shadow-and-fallbacks/`

#### Day 4–5: Vacancies PR2 — Simplify Spring Contract ✅ COMPLETED
- **Issue**: Clean up translation layer after shadow removal
- **Scope**:
  - Remove duplicate `SpringVacancyResponse` types
  - Remove `normalizeSpringVacancyStatus` if Spring owns status
  - Remove `getUnsupportedSpringVacancyFields` if Spring supports all fields
  - Simplify vacancy DTO mapping
- **Files affected**: vacancy routes, `springBackend.ts`
- **SDD change name**: `simplify-spring-vacancy-contract`
- **Estimated**: 3–4h
- **Archive**: `openspec/changes/archive/2026-07-05-simplify-spring-vacancy-contract/`

### Week 2: Core Domains + Cleanup

#### Day 6–7: Applications PR1 — Move Intake to Spring
- **Issue**: Move application submission to Spring
- **Scope**:
  - Create Spring endpoints: `POST /api/v1/applications`, `GET /api/v1/applications`
  - Move candidate upsert/identity logic to Spring
  - Move duplicate detection to Spring
  - Move vacancy validation to Spring (remove Next-side Spring fetch)
- **SDD change name**: `move-application-intake-to-spring`
- **Estimated**: 8–10h

#### Day 8: Applications PR2 — Move Admin Lifecycle
- **Issue**: Move application admin operations to Spring
- **Scope**:
  - Create Spring endpoints: `GET/PATCH/DELETE /api/v1/applications/[id]`
  - Move status transitions to Spring
  - Move exports to Spring
  - Create Next API adapters that delegate to Spring
- **SDD change name**: `move-application-admin-to-spring`
- **Estimated**: 6–8h

#### Day 9: Contacts + Candidates
- **Issue**: Move contact and candidate workflows to Spring
- **Scope**:
  - Create Spring endpoints for contacts CRUD
  - Create Spring endpoints for candidates CRUD
  - Move dedupe, validation, lifecycle to Spring
  - Create Next API adapters
- **SDD change name**: `move-contact-and-candidate-ops-to-spring`
- **Estimated**: 6–8h

#### Day 10: Admin Ops + Full Prisma Removal
- **Issue**: Move admin operations, jobs, and REMOVE Prisma completely
- **Scope**:
  - Move notifications, audit, settings to Spring
  - Move retention jobs to Spring
  - Move rate limiting/captcha enforcement to Spring
  - Decouple Next from direct DB access
  - Remove migration fallbacks
  - **DELETE Prisma completely**:
    - Remove `prisma/` directory (archive schema as historical)
    - Remove `@prisma/client` and `@prisma/adapter-pg` from `package.json`
    - Delete `src/lib/prisma.ts`
    - Remove `DATABASE_URL` from Next.js env requirements
    - Remove `npx prisma migrate` and `npx prisma generate` from scripts
- **SDD change name**: `move-admin-ops-and-remove-prisma`
- **Estimated**: 8–10h

## Dependency Graph

```
Schema Strategy (RFC)
    ↓
Vacancies (PR1 → PR2)
    ↓
Applications (PR1 → PR2)
    ↓
Contacts + Candidates (parallel with Applications PR2)
    ↓
Admin Ops + Prisma Removal
```

## Critical Path
1. Schema strategy MUST be decided before any domain migration
2. Vacancies MUST be cleaned before applications (applications reference vacancies)
3. Applications PR1 MUST complete before PR2 (intake before admin)
4. Contacts+candidates can run parallel with applications PR2
5. Prisma removal is the FINAL step (after all domains are migrated)

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Schema mismatch blocks migration | High | ADR-001: JPA is canonical |
| Application submission breaks during migration | High | Feature flag + rollback path |
| Admin access breaks during auth transition | High | `SPRING_AUTH_ENABLED` toggle (already implemented) |
| Data inconsistency during dual-write window | Medium | Expand/contract migration pattern |
| Spring backend not ready for all domains | Medium | Keep Next API adapters as temporary BFF |
| Prisma removal breaks something | Medium | Remove last, after all domains migrated |

## Token Budget Estimate

| Phase | Estimated tokens |
|---|---|
| Schema strategy RFC | 50–80k |
| Vacancies (2 PRs) | 100–150k |
| Applications (2 PRs) | 150–200k |
| Contacts + Candidates | 80–120k |
| Admin Ops + Prisma Removal | 80–120k |
| **Total** | **460–670k** |

## SDD Change Names (for `/sdd-new`)

1. `align-spring-and-prisma-schema-strategy`
2. `remove-vacancy-prisma-shadow-and-fallbacks`
3. `simplify-spring-vacancy-contract`
4. `move-application-intake-to-spring`
5. `move-application-admin-to-spring`
6. `move-contact-and-candidate-ops-to-spring`
7. `move-admin-ops-and-remove-prisma`

## Success Criteria

After this roadmap is complete:
- [ ] Spring owns all backend logic
- [ ] JPA is the sole ORM
- [ ] Prisma is completely removed from the project
- [ ] Next.js has no direct DB access
- [ ] Next.js has no business logic in API routes
- [ ] All API routes are thin adapters to Spring
- [ ] No Prisma fallback paths remain
- [ ] No hybrid source of truth remains
- [ ] Spring can run independently
- [ ] Next can deploy without DATABASE_URL
- [ ] `package.json` has no Prisma dependencies
- [ ] `prisma/` directory is archived (read-only historical reference)

## Files to Archive (not delete)

| File | Action | Reason |
|---|---|---|
| `prisma/schema.prisma` | Archive to `docs/archive/` | Historical reference for data model evolution |
| `prisma/migrations/` | Archive to `docs/archive/` | Migration history reference |
| `prisma/seed.ts` | Delete | Spring has its own seed mechanism |
