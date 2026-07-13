# Proposal: Move Contact and Candidate Operations to Spring

## Intent

Eliminate Prisma writes for contacts and candidates by delegating both domains to Spring, completing the roadmap target. Contacts move fully (public submit + admin lifecycle). Candidates move write-side (manual create/update) and read-side (export source cutover). No Prisma fallback — Spring/JPA is authoritative from cutover.

## Scope

### In Scope
- Spring contact schema parity (`Contacto` fields: `subject`, `personKey`, `updatedAt`)
- Spring contact repository, service, controller for public submit + admin CRUD
- Spring 24h duplicate detection (transactional `SELECT FOR UPDATE` replacing PostgreSQL advisory lock)
- Spring candidate manual create (with spontaneous `Postulacion`) and update endpoints
- Candidate export CSV source cutover from Prisma to Spring-backed data
- Next thin adapters (auth, CSRF, audit, rate-limit, captcha remain in Next)
- DTO decoupling from `@prisma/client` types

### Out of Scope
- Admin audit JPA migration (audit stays in Next)
- Standalone `GET /candidates` endpoint (list remains derived from `/api/applications`)
- Final Prisma package/schema removal
- Legacy Prisma row backfill into JPA (Spring-only from cutover forward)

## Capabilities

### New Capabilities
- `contact-lifecycle`: Spring-owned contact public submit, admin list/detail, status transitions (ContactStatusMachine parity), and delete
- `candidate-admin-operations`: Spring-owned manual candidate create (Candidato + spontaneous Postulacion) and identity update with personKey conflict detection
- `candidate-export`: Spring-backed candidate CSV export with correct vacancy metadata, replacing Prisma-based export that loses vacancy context

### Modified Capabilities
None — existing spec requirements are unchanged. Prior non-goals about candidate CRUD/export being deferred are now addressed by this change's new capabilities.

## Approach

Combined change with two internal slices: contacts first, candidates second. Contacts move fully to Spring (submit + lifecycle). Candidates move write-side (manual ops) and read-side (export source cutover). Next remains the thin edge for auth, CSRF, audit, rate-limit, and captcha. No Prisma coexistence.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/contacts/` | Removed | Contact routes become thin Spring adapters |
| `src/app/api/admin/candidates/` | Modified | Candidate routes become thin Spring adapters |
| `src/app/api/admin/candidates/export/` | Modified | CSV generation stays in Next, data source switches to Spring |
| `src/lib/dto/contact.ts` | Modified | Decouple from `@prisma/client` `Contact` type |
| `src/lib/dto/application.ts` | Modified | Decouple from Prisma `ApplicationStatus`/`Vacancy` types |
| `src/lib/personIdentity.ts` | Modified | Spring must replicate `buildPersonKey()`; parity test needed |
| `backend/.../Contacto.java` | Modified | Add `subject`, `personKey`, `updatedAt` fields |
| `backend/.../SecurityConfig.java` | Modified | Extend internal-token protection for new endpoints |
| `backend/` | New | Contact controller, service, repository; Candidate admin controller, service |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Contact dedupe regression | Med | Transactional `SELECT FOR UPDATE` on personKey replaces advisory lock |
| Legacy Prisma rows invisible after cutover | Med | Document "Spring-only forward" policy; no backfill in this change |
| personKey collision on migration | Low | Parity test between Next and Spring `buildPersonKey()` |
| Candidate export vacancy metadata regression | Low | Export query joins vacancy data; contract test verifies correctness |
| Prisma type coupling persists in DTOs | Low | DTOs explicitly refactored to backend-agnostic shapes |

## Rollback Plan

Revert Next route handlers to Prisma-backed implementations (code revert per domain). Spring endpoints can remain deployed — Next adapters check `BACKEND_URL`; when absent, contacts return `503`. Candidate export revert restores Prisma query path. JPA data created during the window won't be visible after rollback.

## Dependencies

- Spring `ApplicationManager` and `personKey` logic (already exists)
- Spring `SecurityConfig` internal-token filter (already exists)
- `BACKEND_URL` env must be set in all deployed environments

## Success Criteria

- [ ] Public contact submission creates `Contacto` in Spring, not Prisma
- [ ] Admin contact list/detail/status/delete reads from Spring
- [ ] Contact duplicate detection rejects same personKey+subject within 24h
- [ ] Admin manual candidate create writes `Candidato` + `Postulacion` in Spring
- [ ] Candidate export CSV includes correct vacancy title/location from Spring
- [ ] All existing Vitest + Playwright tests pass with backend running
- [ ] No new `@prisma/client` imports in contact/candidate DTOs
- [ ] `typecheck` and `lint` pass cleanly
