# Tasks: Move Application Admin Lifecycle to Spring

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-850 (incl. tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-always |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Spring domain + DTOs + security | PR 1 | State machine, entity fix, DTOs, boundary interface, repository fetch, SecurityConfig. Base: `main`. Tests: JUnit state machine + entity. |
| 2 | Spring application layer + REST | PR 2 | ApplicationManager methods, REST controller endpoints. Base: PR 1 branch. Tests: Mockito manager + integration controller. |
| 3 | Next adapter + gateway | PR 3 | Gateway module, route.ts rewrite, DTO mapping. Base: PR 2 branch. Tests: Vitest gateway + route. |

---

## Phase 1: Spring Domain — State Machine & Entity

- [x] 1.1 Create `backend/src/main/java/com/meinardi/rrhh/domain/model/ApplicationStatusMachine.java` — standalone class with `canTransition(from, to)`, `assertTransition(from, to)`, matching Next's 6 valid transitions + terminal + same-state rejection
- [x] 1.2 Modify `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` — refactor `ponerEnRevision()`, `marcarComoEntrevistado()`, `rechazar()`, `aceptar()` to delegate to `ApplicationStatusMachine.assertTransition()` instead of inline guards
- [x] 1.3 Create `backend/src/main/java/com/meinardi/rrhh/application/ApplicationAdminInputBoundary.java` — interface with `getById(String id)`, `updateStatus(String id, String status)`, `delete(String id)` [tightened: returns `ApplicationDetailResponse` instead of `Object`]
- [x] 1.4 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationDetailResponse.java` — record with `id, candidateId, candidateName, email, phone, resumeUrl, resumeFileName, coverLetter, status, submittedAt, vacancy`
- [x] 1.5 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationStatusUpdateRequest.java` — record with `String status`
- [x] 1.6 Modify `backend/src/main/java/com/meinardi/rrhh/infrastructure/PostulacionRepository.java` — add `findByIdWithCandidatoAndVacante(String id)` using `@Query("SELECT p FROM Postulacion p JOIN FETCH p.candidato LEFT JOIN FETCH p.vacante WHERE p.id = :id")`
- [x] 1.7 Modify `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` — add `GET/PATCH/DELETE /api/v1/applications/{id}` rules requiring `X-Backend-Api-Key` [narrowed: uses explicit `{id}` routes instead of `/**`]

## Phase 2: Spring Application Layer & REST Endpoints

- [x] 2.1 Modify `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java` — add `getById()` calling repository fetch, mapping to `ApplicationDetailResponse`; throw `ResponseStatusException(HttpStatus.NOT_FOUND)` on empty
- [x] 2.2 Add `updateStatus()` to `ApplicationManager` — load Postulacion, call entity method, persist, return mapped response; catch `IllegalStateException` → 400, same-status → 409
- [x] 2.3 Add `delete()` to `ApplicationManager` — load Postulacion, delete via repository; throw 404 if missing
- [x] 2.4 Modify `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRestController.java` — add `@GetMapping("/{id}")` returning `ApplicationDetailResponse`
- [x] 2.5 Add `@PatchMapping("/{id}/status}")` to controller — accept `ApplicationStatusUpdateRequest`, delegate to manager
- [x] 2.6 Add `@DeleteMapping("/{id}")` to controller — delegate to manager, return `{ success: true }`

## Phase 3: Next.js Gateway & Adapter

- [x] 3.1 Create `src/lib/server/springApplicationGateway.ts` — export `getApplication(id)`, `updateApplicationStatus(id, status)`, `deleteApplication(id)` using `springBackend.ts` helper with `X-Backend-Api-Key`; include `SpringApplicationDetailResponse` type and error parsing (404 → null, 400/409 → typed error)
- [x] 3.2 Modify `src/app/api/applications/[id]/route.ts` — replace Prisma GET handler with: auth check → `rejectIfUntrustedOrigin` → `auditAdminAction(DENIED)` on fail → call `getApplication()` → `auditAdminAction(SUCCESS)` → return mapped response; return `503` when `BACKEND_URL` is absent (Spring/JPA authoritative, no Prisma fallback)
- [x] 3.3 Rewrite PATCH handler in `[id]/route.ts` — auth → origin → validate body → call `updateApplicationStatus()` → audit → return; map 400/409 from Spring to Next error responses
- [x] 3.4 Rewrite DELETE handler in `[id]/route.ts` — auth → origin (add missing `rejectIfUntrustedOrigin`) → call `deleteApplication()` → audit → return `{ success: true }`
- [x] 3.5 Modify `src/lib/dto/application.ts` — ensure `toApplicationAdminDto()` handles `SpringApplicationDetailResponse` shape (candidateName already combined, vacancy as nested object)

## Phase 4: Tests

- [x] 4.1 Create `backend/src/test/java/.../domain/model/ApplicationStatusMachineTest.java` — JUnit 5 parameterized: 6 valid transitions, 4 invalid (terminal + skip), same-state rejection
- [x] 4.2 Create `backend/src/test/java/.../domain/model/PostulacionTest.java` — verify entity methods delegate to machine: valid transition changes state, invalid throws, status unchanged on error
- [x] 4.7 Add `findByIdWithCandidatoAndVacante` tests to `PostulacionRepositoryTest.java` — test returns postulacion with relations, empty for non-existent id, handles spontaneous application
- [x] 4.8 Add `{id}` route security tests to `SecurityConfigApplicationRoutesTest.java` — test GET/PATCH/DELETE `/api/v1/applications/{id}` reject without valid API key
- [x] 4.9 Add `ApplicationAdminInputBoundaryTest.java` — verify interface returns typed `ApplicationDetailResponse` instead of `Object`
- [x] 4.3 Create `backend/src/test/java/.../application/ApplicationManagerTest.java` — Mockito: getById success/not-found, updateStatus valid/invalid/same-state, delete success/not-found
- [x] 4.4 Create `backend/src/test/java/.../presentation/ApplicationRestControllerIntegrationTest.java` — `@SpringBootTest` + `TestRestTemplate`: GET 200/404, PATCH 200/400/404/409, DELETE 200/404, 401 on missing API key
- [x] 4.5 Create `src/lib/server/__tests__/springApplicationGateway.test.ts` — Vitest: mock fetch, test getApplication success/404, updateApplicationStatus success/400/409, deleteApplication success/404
- [x] 4.6 Update or create `src/app/api/applications/[id]/__tests__/route.test.ts` — Vitest: mock auth/audit/gateway, test GET denied→401, GET success→200+audit, PATCH invalid→400, DELETE success→200+audit
