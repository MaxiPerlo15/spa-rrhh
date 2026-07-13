# Proposal: Move Application Intake to Spring

## Intent
Move public application submission and admin application listing from Next/Prisma ownership to Spring so candidate identity, vacancy validation, duplicate prevention, and write-side rules live in the backend system of record.

## Scope
### In Scope
- Spring-owned `POST /api/v1/applications` for public submission.
- Spring-owned `GET /api/v1/applications` for admin listing.
- Thin Next adapters for `POST`/`GET /api/applications`.
- Spring ownership of `personKey`, 24h duplicate detection, and concurrency-safe intake.

### Out of Scope
- `src/app/api/applications/[id]/route.ts` lifecycle operations.
- Candidate CRUD/export routes.
- Prisma removal, legacy row backfill, or full schema cleanup.

## Capabilities
### New Capabilities
- `application-intake`: Public application submission delegated from Next to Spring, including vacancy validation, candidate upsert, duplicate rejection, and creation semantics.
- `admin-applications-list`: Admin application listing served by Spring and exposed through a thin Next adapter.

### Modified Capabilities
- None. Existing `admin-session` and `admin-authorization` specs are dependencies, not behavior changes in this slice.

## Approach
Keep Next as ingress/BFF: validate request shape and public guard policy on `POST /api/applications`, enforce admin session on `GET /api/applications`, then forward both calls to Spring. Spring adds controller, DTO, service, and repositories; computes `personKey`; preserves the 24h duplicate rule; and uses transactional locking equivalent to the current advisory lock to avoid concurrent duplicate inserts.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/applications/route.ts` | Modified | Replace Prisma ownership with Spring adapter logic |
| `src/lib/personIdentity.ts` | Modified | Remains source for parity or shared rule reference |
| `backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java` | Modified | Add Prisma-parity identity/resume fields |
| `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` | Modified | Support intake/list ownership semantics |
| `backend/src/main/java/com/meinardi/rrhh/application` | New/Modified | Intake/list service use cases |
| `backend/src/main/java/com/meinardi/rrhh/presentation` | New | Application controller and DTOs |

## Risks
- Schema drift between Prisma and JPA can lose candidate/application fields.
- Weak locking can regress 24h duplicate protection under concurrency.
- Mixed old/new datasets can fragment admin list results during rollout.

## Rollback Plan
Revert Next `src/app/api/applications/route.ts` to the current Prisma-backed flow, disable Spring application endpoints, and keep existing Prisma tables untouched so submission and admin listing return to the prior path without data migration.

## Dependencies
- `openspec/plans/spring-backend-migration-roadmap.md`
- `openspec/plans/rfc-001-schema-strategy.md`
- Existing admin session/authorization capabilities for protected list access.

## Success Criteria
- Next `POST`/`GET /api/applications` act only as adapters.
- Spring owns `personKey`, vacancy validation, and 24h duplicate rejection.
- Admin list data is served from Spring for the migrated path.
- This slice ships without changing `/api/applications/[id]`, candidate CRUD/export, or removing Prisma.
