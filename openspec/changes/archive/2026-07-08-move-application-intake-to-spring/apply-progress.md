## PR 1 + PR 2 + PR 3 Apply Progress — All Tasks Complete

### Completed Tasks

**PR 1 (Domain Model, Repositories, DTOs & Application Layer):**
- [x] 1.1 Candidato.java — added personKey, resumeUrl, resumeFileName, resumeKey, createdAt, updatedAt fields
- [x] 1.2 Postulacion.java — added updatedAt, submittedAt, createSpontaneous() factory method
- [x] 1.3 CandidatoRepository.java — JPA repository with findByPersonKey
- [x] 1.4 PostulacionRepository.java — JPA repository with findRecentByCandidatoAndVacante + findRecentSpontaneousByCandidato
- [x] 2.1 ApplicationRequest.java — DTO record for intake payload
- [x] 2.2 ApplicationResponse.java — DTO record for 201 response
- [x] 2.3 ApplicationListResponse.java — DTO record for admin list item with nested VacancySummary
- [x] 2.4 SubmitApplicationCommand.java — command record with factory method
- [x] 2.5 ApplicationIntakeInputBoundary.java — interface for intake use case
- [x] 2.6 ApplicationListInputBoundary.java — interface for list use case
- [x] 2.7 ApplicationManager.java — implements both boundaries; SHA-256 personKey parity with Next, candidate upsert, 24h duplicate check, vacancy validation, spontaneous support
- [x] F1 personKey parity test strengthened — asserts exact SHA-256 hash plus triangulation with second known input
- [x] F2 CandidatoRepository.findByPersonKey — added @Lock(LockModeType.PESSIMISTIC_WRITE) for SELECT FOR UPDATE concurrency safety

**PR 2 (Controller, Security & Next Adapter):**
- [x] 3.1 ApplicationRestController.java — POST /api/v1/applications (public, intake) + GET /api/v1/applications (API-key-protected, list)
- [x] 3.2 SecurityConfig.java — added permitAll for POST /api/v1/applications; internal API token check for GET
- [x] 3.3 src/app/api/applications/route.ts — rewritten as thin Spring adapter
- [x] 3.4 src/lib/personIdentity.ts — added Java parity comment
- [x] ApplicationExceptionHandler.java — exception handler mapping
- [x] SecurityConfigTest.java — added @MockitoBean for application boundaries
- [x] applicationsRoute.test.ts — rewritten for Spring adapter
- [x] applicationsListRoute.test.ts — rewritten for Spring adapter
- [x] route.ts Prisma coupling removed — replaced @prisma/client import with domain-layer type
- [x] ApplicationRestControllerTest.java — 11 tests with filters ENABLED
- [x] 4.1 personKey parity tests — covered by ApplicationManagerTest.java (5 tests)
- [x] 4.2 duplicate detection tests — covered by ApplicationManagerTest.java (2 tests)
- [x] 4.4 POST integration tests — covered by ApplicationRestControllerTest.java (5 tests)
- [x] 4.5 GET integration tests — covered by ApplicationRestControllerTest.java (6 tests)
- [x] 4.6 Next adapter contract — covered by applicationsRoute.test.ts (5 tests) + applicationsListRoute.test.ts (6 tests)
- [x] 5.1 lint + typecheck — both pass clean
- [x] 5.2 unit tests — 269/269 Next + 108/108 Backend all pass

**PR 3 (Concurrency Tests, E2E & Documentation):**
- [x] 4.3 Concurrency-safe intake test — ApplicationManagerConcurrencyTest.java (2 tests)
- [x] 5.3 E2E verification — spring-application-flow.spec.ts (4 tests)
- [x] 5.4 exploration.md updated with 8 implementation gotchas

### TDD Cycle Evidence

**PR 1:**
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | CandidatoTest.java | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 5 cases | ➖ None needed |
| 1.2 | PostulacionTest.java | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 5 cases | ➖ None needed |
| 1.3 | CandidatoRepositoryTest.java | Integration | N/A (new) | ✅ Written | ✅ Passed | ✅ 3 cases | ➖ None needed |
| 1.4 | PostulacionRepositoryTest.java | Integration | N/A (new) | ✅ Written | ✅ Passed | ✅ 3 cases | ➖ None needed |
| 2.1-2.6 | N/A | N/A | N/A | N/A | N/A | N/A | N/A (structural) |
| 2.7 | ApplicationManagerTest.java | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 12 cases | ✅ Clean |
| F1 | ApplicationManagerTest.java | Unit | ✅ 93/93 | ✅ Written | ✅ Passed | ✅ 2 cases | ➖ None needed |
| F2 | CandidatoRepositoryTest.java | Integration | ✅ 93/93 | ✅ Written | ✅ Passed | ➖ Single | ➖ None needed |

**PR 2:**
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.3 | applicationsRoute.test.ts | Unit | ✅ 269/269 | ✅ Written | ✅ Passed | ✅ 5 cases | ✅ Clean |
| 3.3 | applicationsListRoute.test.ts | Unit | ✅ 269/269 | ✅ Written | ✅ Passed | ✅ 6 cases | ✅ Clean |
| route.ts fix | Route tests | Unit | ✅ 269/269 | N/A | ✅ 11/11 | ✅ 11 cases | ✅ Clean |
| controller+security | ApplicationRestControllerTest.java | Integration | ✅ 95/95 | ✅ Written | ✅ Passed | ✅ 11 cases | ✅ Clean |

**PR 3:**
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.3 | ApplicationManagerConcurrencyTest.java | Unit | ✅ 108/108 | ✅ Written | ✅ Passed | ✅ 2 cases | ✅ Clean |
| 5.3 | spring-application-flow.spec.ts | E2E | N/A (new) | ✅ Written | ✅ Verified | ✅ 4 cases | ✅ Clean |

### Test Summary
- Total tests passing: 269 (Next) + 108 (Backend) = 377 total
- Layers used: Unit (Next: 21, Backend: 68), Integration (Backend: 33), E2E (New: 4)
- Pure functions created: 1 (buildPersonKey)

### Files Changed (PR 3)
| File | Action | What Was Done |
|------|--------|---------------|
| `backend/src/test/.../application/ApplicationManagerConcurrencyTest.java` | Created | 2 concurrency tests simulating race condition with AtomicInteger counters |
| `tests/e2e/spring-application-flow.spec.ts` | Created | 4 E2E tests: spontaneous 201, vacancy 201, duplicate 409, auth 401 |
| `openspec/changes/move-application-intake-to-spring/exploration.md` | Modified | Added 8 gotchas discovered during implementation |
| `openspec/changes/move-application-intake-to-spring/tasks.md` | Modified | Marked tasks 4.3, 5.3, 5.4 complete |

### Deviations from Design
None — implementation matches design.

### Issues Found
None.

### All Tasks Complete
All 24 tasks across all 3 PRs are complete.
