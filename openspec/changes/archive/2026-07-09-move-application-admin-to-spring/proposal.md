# Proposal: Move Application Admin Lifecycle to Spring

## Intent

Complete the Spring migration of application admin operations by moving detail GET, status PATCH, and hard DELETE for `/api/applications/[id]` to Spring. Fix the incomplete Spring `Postulacion` state machine to match Next's `ApplicationStatusMachine` exactly. Spring/JPA is the authoritative source; Next adapter returns `503` when `BACKEND_URL` is absent.

## Scope

### In Scope
- Spring `GET /api/v1/applications/{id}` — detail with candidate + vacancy metadata
- Spring `PATCH /api/v1/applications/{id}/status` — status update with full state machine
- Spring `DELETE /api/v1/applications/{id}` — hard delete
- Fix Spring `Postulacion` state transition guards (PENDING→REVIEWING, REVIEWING→INTERVIEWED, →REJECTED, terminal states)
- Next adapter: thin handlers that validate admin session, audit via `auditAdminAction()`, forward to Spring, map response
- Spring `SecurityConfig`: `X-Backend-Api-Key` rules for `{id}` endpoints
### Out of Scope
- Export migration (CSV generation and data source changes) — addressed separately
- JPA `AdminAuditLog` entity (RFC-001 Day 10)
- Prisma `Candidate`/`Application` data migration to JPA
- Candidate CRUD migration
- Prisma schema/package removal
- Soft-delete semantics

## Capabilities

### New Capabilities
- `spring-admin-application-lifecycle`: Spring-owned admin detail GET, status PATCH, and hard DELETE for `/api/v1/applications/{id}` with API key auth, state machine validation, and transactional integrity.
- `spring-application-state-machine`: Full state transition validation in Spring matching Next's `ApplicationStatusMachine` — guarded entity methods or standalone machine class rejecting illegal transitions and terminal-state mutations.

### Modified Capabilities
- `admin-applications-list`: Remove non-goal "detail/lifecycle remains Prisma-backed." The list already delegates to Spring; now `{id}` paths delegate too.
- `application-intake`: Remove non-goal "lifecycle operations remain Prisma-backed." The intake established Spring ownership; this completes the set.

## Approach

**Spring-owned lifecycle, Next thin adapter, audit stays in Next.** Spring's `Postulacion` entity methods get full guards replicating Next's state machine (6 transitions, terminal states, same-state rejection). Next adapter validates admin session via NextAuth, calls `auditAdminAction()` for audit trail, forwards with `X-Backend-Api-Key`, maps response.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/applications/[id]/route.ts` | Rewritten | Thin adapter: session check → audit → Spring forward → map |
| `backend/.../ApplicationRestController.java` | Modified | Add `@GetMapping/{id}`, `@PatchMapping/{id}/status`, `@DeleteMapping/{id}` |
| `backend/.../ApplicationManager.java` | Modified | Add `getById`, `updateStatus`, `delete` methods |
| `backend/.../Postulacion.java` | Modified | Fix state guards on `ponerEnRevision`, `marcarComoEntrevistado`, `rechazar` |
| `backend/.../SecurityConfig.java` | Modified | Add `{id}` path rules for `X-Backend-Api-Key` |
| `src/lib/dto/application.ts` | Modified | Ensure `ApplicationDetailDto` maps Spring detail shape |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| State machine mismatch between Spring and Next | Med | Full test suite of all 7 transition paths against Next spec |
| Old Prisma applications 404 on detail endpoint | High | Document; RFC-001 data migration backfills old rows later |
| Concurrent status update lost write | Low | `@Version` on Postulacion; existing Next code also lacks this guard |
| Audit log gap between Spring success and Next audit write | Low | Acceptable — current code has audit after Prisma ops, same pattern |

## Rollback Plan

Feature-flag `BACKEND_URL` presence controls forwarding. When `BACKEND_URL` is absent, the `{id}` route returns `503` (matching the existing pattern for the list endpoint). Rollback: remove Spring endpoint deployment (or keep them live — they're harmless without adapters), revert `[id]/route.ts` to Prisma-backed version. No data migration needed (old Prisma rows untouched).

## Dependencies

- Spring intake migration (`move-application-intake-to-spring`) — already archived 2026-07-08
- `springBackend.ts` internal token forwarding helper — already in place
- `BACKEND_URL` env var — already set in production

## Success Criteria

- [ ] `GET /api/applications/[id]` returns Spring data with candidate + vacancy metadata identical to current Prisma shape
- [ ] `PATCH /api/applications/[id]` rejects illegal transitions with same error codes as current Next handler
- [ ] `DELETE /api/applications/[id]` hard-deletes and returns 200 on success, 404 on missing
- [ ] Spring state machine tests cover all 7 transition paths: PENDING→REVIEWING→INTERVIEWED→ACCEPTED, + REJECTED from PENDING/REVIEWING/INTERVIEWED, + same-state rejection
- [ ] Admin audit entries written in Next adapter after Spring success contain correct applicationId and status
- [ ] Existing admin list (GET /api/applications) unaffected — regression pass
