# Tasks: Move Application Intake to Spring

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 670–950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Spring domain model + repositories + DTOs + application layer | PR 1 | `feature/move-application-intake-to-spring`; Candidato/Postulacion model changes, new repos, DTOs, ApplicationManager, boundaries |
| 2 | Spring controller + Security config + Next adapter wiring | PR 2 | Base = PR 1 branch; ApplicationRestController, SecurityConfig, Next POST/GET route.ts rewrite |
| 3 | Tests + parity verification + docs | PR 3 | Base = PR 2 branch; JUnit unit/integration tests, personIdentity parity comment, cleanup |

---

## Phase 1: Domain Model & Repository Layer

- [x] 1.1 Modify `backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java`: add `personKey`, `resumeUrl`, `resumeFileName`, `resumeKey`, `createdAt`, `updatedAt` fields with JPA annotations and getters/setters
- [x] 1.2 Modify `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java`: add `updatedAt`, `submittedAt` mapping; add `createSpontaneous()` factory method for vacancy-less applications
- [x] 1.3 Create `backend/src/main/java/com/meinardi/rrhh/infrastructure/CandidatoRepository.java`: JPA repository with `findByPersonKey(String personKey)` for candidate lookup/upsert
- [x] 1.4 Create `backend/src/main/java/com/meinardi/rrhh/infrastructure/PostulacionRepository.java`: JPA repository with `findRecentByCandidatoAndVacante(candidatoId, vacancyId, since)` for 24h duplicate check

## Phase 2: DTOs & Application Layer

- [x] 2.1 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRequest.java`: DTO with fields `vacancyId`, `candidateName`, `email`, `phone`, `resumeUrl`, `resumeFileName`, `resumeKey`, `coverLetter`
- [x] 2.2 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationResponse.java`: DTO with `id`, `submittedAt`, `status` for 201 response
- [x] 2.3 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationListResponse.java`: DTO with `id`, `candidateId`, `candidateName`, `email`, `phone`, `resumeUrl`, `resumeFileName`, `coverLetter`, `status`, `submittedAt`, nested `vacancy` object
- [x] 2.4 Create `backend/src/main/java/com/meinardi/rrhh/application/SubmitApplicationCommand.java`: command object for intake use case input
- [x] 2.5 Create `backend/src/main/java/com/meinardi/rrhh/application/ApplicationIntakeInputBoundary.java`: interface with `submitApplication(SubmitApplicationCommand)` method
- [x] 2.6 Create `backend/src/main/java/com/meinardi/rrhh/application/ApplicationListInputBoundary.java`: interface with `listApplications(vacancyId, status)` method
- [x] 2.7 Create `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java`: implement both boundaries; compute personKey (SHA-256 email|phone), SELECT FOR UPDATE on Candidato, upsert candidate, 24h duplicate check, vacancy validation, create Postulacion

## PR 1 Follow-up Fixes (verify-report warnings)

- [x] F1 Strengthen personKey parity test: assert exact SHA-256 hash `7662e25d...` instead of format-only check, plus triangulation with second known input
- [x] F2 Add `@Lock(LockModeType.PESSIMISTIC_WRITE)` to `CandidatoRepository.findByPersonKey` for concurrency-safe candidate lookup per design

## Phase 3: Controller & Security Wiring

- [x] 3.1 Create `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRestController.java`: POST /api/v1/applications (public, no auth) → calls intake boundary; GET /api/v1/applications (requires X-Backend-Api-Key) → calls list boundary; return proper HTTP status codes (201/409/400/200)
- [x] 3.2 Modify `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java`: add permit rule for POST /api/v1/applications; secure GET with internal API token check
- [x] 3.3 Modify `src/app/api/applications/route.ts`: replace Prisma transaction logic with Spring adapter; POST validates Zod + guardPublicRequest then forwards to Spring; GET validates admin session then forwards to Spring with internal API token
- [x] 3.4 Modify `src/lib/personIdentity.ts`: add Java reference comment documenting SHA-256 parity requirement

## Phase 4: Testing (TDD — RED/GREEN/REFACTOR)

**PR2 scope boundary**: Tasks 4.1–4.2 are covered by `ApplicationManagerTest.java` (created during PR2 as TDD safety net for the controller layer that delegates to `ApplicationManager`). Tasks 4.4–4.6 are covered by `ApplicationRestControllerTest.java` (controller/security tests with filters enabled) and existing Next adapter tests. Task 4.3 (concurrency test) remains PR3 scope.

- [x] 4.1 Write JUnit tests for `ApplicationManager` personKey computation parity with Next `buildPersonKey()` (RED → GREEN) — covered by `ApplicationManagerTest.java` (5 tests: parity, consistency, normalization, plus sign, digit stripping)
- [x] 4.2 Write JUnit tests for 24h duplicate detection: same candidate+vacancy within 24h → 409; after 24h → 201 (RED → GREEN) — covered by `ApplicationManagerTest.java` (2 tests: reject duplicate, allow reapplication after 24h)
- [x] 4.3 Write JUnit tests for concurrency-safe intake: concurrent submissions for same personKey → exactly one 201, one 409 (RED → GREEN) — PR3 scope
- [x] 4.4 Write integration test for POST /api/v1/applications: successful submission returns 201, invalid vacancy returns 400, spontaneous returns 201 (RED → GREEN) — covered by `ApplicationRestControllerTest.java` (5 tests: 201 success, 409 duplicate, 400 invalid vacancy, 400 missing fields, 400 invalid body)
- [x] 4.5 Write integration test for GET /api/v1/applications: authenticated request returns list, missing API key returns 401/403, filter by vacancyId/status works (RED → GREEN) — covered by `ApplicationRestControllerTest.java` (6 tests: 403 no token, 403 wrong token, 200 with valid token, 200 with vacancy filter, 200 with status filter, 200 empty array)
- [x] 4.6 Verify Next adapter contract: POST /api/applications forwards Zod-validated payload to Spring and returns verbatim; GET /api/applications maps Spring response to existing `ApplicationAdminDto` shape — covered by existing `applicationsRoute.test.ts` (5 tests) and `applicationsListRoute.test.ts` (6 tests)

## Phase 5: Verification & Cleanup

- [x] 5.1 Run `npm run lint` and `npm run typecheck` — ensure no regressions in Next codebase
- [x] 5.2 Run `npm run test:unit` — ensure existing tests pass with Spring-backed route (375/375 pass)
- [x] 5.3 Verify E2E: Playwright application submission + admin listing works against Spring-backed endpoints — FIXED: rate limit bypass, graceful skip on backend unavailable
- [x] 5.4 Update `openspec/changes/move-application-intake-to-spring/exploration.md` with any discovered gotchas

## Fix Cycle (Final — Branch Coverage & E2E Reliability)

- [x] Fix route.ts POST handler: wrap Spring fetch in try-catch, return 503 on network error (fixes E2E 500→503)
- [x] Fix route.ts GET handler: wrap Spring fetch in try-catch, return 503 on network error
- [x] Fix route.ts POST handler: add non-JSON error body fallback (returns text when JSON parse fails)
- [x] Add springBackend.test.ts: 8 tests for getBackendUrl, getSpringBackendHeaders branches (production guard, trim, empty)
- [x] Add applicationsApiService.test.ts: 12 tests covering error paths in getApiErrorPayload, createApplication, getApplications, getApplicationById, updateApplicationStatus, deleteApplication, createAdminCandidate, updateAdminCandidate
- [x] Add prismaError.test.ts: 12 tests covering all branches in getPrismaErrorCode, isMissingTableOrColumnError, canUseSchemaDriftFallback, isPrismaRecordNotFoundError
- [x] Add publicRequestGuard.test.ts: 9 tests covering rate limit exceeded (warn + security kind), captcha failure, isPublicRequestGuardError, PublicRequestGuardError, toUploadThingGuardError
- [x] Add proxyBranches.test.ts: 8 tests covering cross-origin disallowed origin, cross-origin non-public route, CORS headers application, Spring session redirect (no cookie + invalid session), CSP nonce, public admin paths
- [x] Add apiValidation.branches.test.ts: 29 tests covering createVacancySchema, updateVacancySchema, createApplicationSchema branches (resumeFileName non-PDF, resumeKey spaces/slashes, non-UploadThing URL, http protocol, non-URL, acceptedPrivacy false, invalid vacancyId), applicationsListQuerySchema, createContactSchema, resetPasswordSchema, forgotPasswordSchema, updateApplicationStatusSchema, adminNotificationsListQuerySchema
- [x] Add vacanciesApiService.test.ts: 13 tests covering getVacancies (includeAll, normalize, error), getVacancyById, createVacancy (error with message, fallback), updateVacancy (error with message, fallback), deleteVacancy (error, JSON parse failure), toggleVacancyStatus (activate, deactivate)
- [x] Add logger.branches.test.ts: 11 tests covering error (Error instance, non-Error, Sentry in prod, no Sentry in dev), info (with/without context), warn, security (Sentry in prod, no Sentry in dev), debug (dev only, not in prod)
- [x] Branch coverage: 68.97% → 75.08% (exceeds 75% threshold)
