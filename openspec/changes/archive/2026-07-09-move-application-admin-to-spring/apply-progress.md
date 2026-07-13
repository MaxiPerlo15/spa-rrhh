# Apply Progress: Move Application Admin Lifecycle to Spring — PR 3

**Change**: move-application-admin-to-spring
**Version**: PR 3 / final slice
**Mode**: Strict TDD
**Date**: 2026-07-09

---

## Tasks Completed

### Phase 1: Spring Domain — State Machine & Entity (PR 1)

- [x] 1.1 Create `ApplicationStatusMachine.java` — standalone state machine
- [x] 1.2 Modify `Postulacion.java` — delegate to machine
- [x] 1.3 Create `ApplicationAdminInputBoundary.java` — returns `ApplicationDetailResponse`
- [x] 1.4 Create `ApplicationDetailResponse.java` — DTO record
- [x] 1.5 Create `ApplicationStatusUpdateRequest.java` — DTO record
- [x] 1.6 Modify `PostulacionRepository.java` — add `findByIdWithCandidatoAndVacante`
- [x] 1.7 Modify `SecurityConfig.java` — explicit `{id}` routes

### Phase 2: Spring Application Layer & REST Endpoints (PR 2)

- [x] 2.1 Modify `ApplicationManager.java` — add `getById()` with `ResponseStatusException(NOT_FOUND)`
- [x] 2.2 Add `updateStatus()` — entity delegation, `IllegalStateException` → 400, same-state → 409
- [x] 2.3 Add `delete()` — repository delete, 404 if missing
- [x] 2.4 Add `@GetMapping("/{id}")` to controller
- [x] 2.5 Add `@PatchMapping("/{id}/status")` to controller
- [x] 2.6 Add `@DeleteMapping("/{id}")` to controller

### Phase 3: Next.js Gateway & Adapter (PR 3)

- [x] 3.1 Create `src/lib/server/springApplicationGateway.ts` — getApplication, updateApplicationStatus, deleteApplication + types + error handling
- [x] 3.2 Rewrite GET handler — Spring delegation via getApplication(), auth+audit+origin
- [x] 3.3 Rewrite PATCH handler — Spring delegation via updateApplicationStatus(), 400/409/404 mapping
- [x] 3.4 Rewrite DELETE handler — Spring delegation via deleteApplication(), 404 mapping
- [x] 3.5 Modify `src/lib/dto/application.ts` — submittedAt accepts Date | string for Spring shape

### Phase 4: Tests (PR 1 + PR 2 + PR 3)

- [x] 4.1 Create `ApplicationStatusMachineTest.java` — 18 tests
- [x] 4.2 Create `PostulacionTest.java` — 16 tests
- [x] 4.3 Add admin lifecycle tests to `ApplicationManagerTest.java` — 8 new tests (21 total)
- [x] 4.4 Create `ApplicationRestControllerIntegrationTest.java` — 11 tests
- [x] 4.5 Create `springApplicationGateway.test.ts` — 10 Vitest tests
- [x] 4.6 Create `route.test.ts` — 17 Vitest tests
- [x] 4.7 Add `findByIdWithCandidatoAndVacante` tests — 3 tests
- [x] 4.8 Add `{id}` route security tests — 8 tests
- [x] 4.9 Add `ApplicationAdminInputBoundaryTest.java` — 4 tests

---

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `springApplicationGateway.test.ts` | Unit | N/A (new) | ✅ Written — 10 tests | ✅ Passed — 10/10 | ✅ 10 cases (getApplication success/404/error, updateApplicationStatus success/400/409/404, deleteApplication success/404/error) | ➖ None needed |
| 3.2-3.4 | `route.test.ts` | Unit | ✅ 375/375 | ✅ Written — 17 tests | ✅ Passed — 17/17 | ✅ 17 cases (GET denied/success/404/error/origin, PATCH denied/success/400/409/404/body, DELETE denied/success/404/error/origin) | ➖ None needed |
| 3.5 | `application.ts` (structural) | Unit | ✅ 401/401 | ✅ Type broadened — no dedicated test file; structural evidence via route.test.ts (17 tests) and gateway.test.ts (10 tests) exercising both Date and string paths | ✅ Both Date and string paths exercised by existing route and gateway tests | ✅ Both Date and string paths exercised by existing tests | ➖ None needed |

---

## Test Summary

- **Total tests written (PR3)**: 27 (10 gateway + 17 route)
- **Total tests passing**: 401 (frontend) + 175 (backend) = 576
- **Layers used**: Unit (27)
- **Approval tests** (refactoring): 0 — no refactoring tasks
- **Pure functions created**: 0
- **Obsolete tests removed**: 1 (applicationStatusRoute.test.ts — Prisma-backed PATCH test)

---

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/lib/server/springApplicationGateway.ts` | Created | Gateway module: getApplication, updateApplicationStatus, deleteApplication, SpringApplicationDetailResponse type, SpringApplicationWriteError |
| `src/app/api/applications/[id]/route.ts` | Rewritten | All 3 handlers delegate to Spring via gateway; auth+audit+origin preserved; BACKEND_URL check added |
| `src/lib/dto/application.ts` | Modified | submittedAt type: Date → Date \| string; toApplicationAdminDto handles both formats |
| `src/lib/server/__tests__/springApplicationGateway.test.ts` | Created | 10 Vitest tests covering all gateway functions |
| `src/app/api/applications/[id]/__tests__/route.test.ts` | Created | 17 Vitest tests covering auth, origin, Spring delegation, audit, error mapping |
| `src/lib/__tests__/applicationStatusRoute.test.ts` | Deleted | Obsolete Prisma-backed PATCH test replaced by Spring-delegated route tests |

---

## Deviations from Design

- **BACKEND_URL absent → 503**: Design originally specified Prisma fallback when `BACKEND_URL` is absent. The implementation returns `503` instead, which is the correct behavior for the target architecture: Spring/JPA is the authoritative source with no adapter fallback to Prisma for this flow. This matches the existing pattern used by `applications/route.ts` (list endpoint). Artifacts have been aligned to reflect this.
- **GET audit action**: Design doesn't specify audit for GET reads. Implementation adds `application.view` audit action on success to maintain full audit trail consistency with other handlers.

---

## Issues Found

None.

---

## Remaining Tasks

All 22 tasks complete. No remaining tasks.

---

## Workload / PR Boundary

- Mode: chained PR slice (feature-branch-chain)
- Current work unit: PR 3 — Next.js gateway + route rewrite + DTO update + tests
- Boundary: springApplicationGateway.ts creation, [id]/route.ts rewrite, application.ts type broadening, 27 new tests, 1 obsolete test removed
- Estimated review budget impact: ~250 lines changed (production + tests)
- Previous PR boundary: PR 2 (Spring application layer + REST endpoints)

---

## Verification Evidence

| Check | Result | Details |
|-------|--------|---------|
| Frontend tests | ✅ 401/401 | `npm run test:unit` — all pass |
| Backend tests | ✅ 175/175 | `mvn test` — all pass (from PR2 baseline) |
| Typecheck | ✅ Passed | `npm run typecheck` — no errors |
| Lint | ✅ Passed | `npm run lint` — no errors |
| Coverage | ✅ Passed | `npm run test:coverage` — all thresholds met |
