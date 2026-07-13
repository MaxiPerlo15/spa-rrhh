# Apply Progress: unify-admin-auth-and-backend-trust — PR 1

**Mode**: Strict TDD
**Batch**: 1 (PR 1 — Spring Auth Foundation)
**Chain strategy**: feature-branch-chain
**Delivery**: chained PR slice

## Completed Tasks

- [x] 1.1 Create `backend/.../presentation/AuthController.java` — login, logout, me endpoints per admin-session spec
- [x] 1.2 Create `backend/.../application/SessionService.java` — session creation, validation, invalidation (HttpSession-backed)
- [x] 1.3 Create `backend/.../presentation/LoginRequest.java` and `LoginResponse.java` DTOs
- [x] 1.4 Add `passwordResetToken` + `passwordResetTokenExpiry` fields to `backend/.../domain/model/Usuario.java`
- [x] 1.5 Create `backend/.../infrastructure/UsuarioRepository.java` — JPA repository for `Usuario` (findByEmail)
- [x] 1.6 Modify `backend/.../infrastructure/SecurityConfig.java` — add `/api/v1/auth/**` permit rules, session-based ADMIN role enforcement
- [x] 1.7 Modify `backend/src/main/resources/application.yml` — add session cookie config (SESSIONID, httpOnly, sameSite, secure)
- [x] 1.8 Write Spring unit tests for `SessionService` — 6 tests (login success/failure, session validation, logout)
- [x] 1.9 Write Spring integration tests for auth endpoints — 12 tests across AuthControllerTest, AuthDtosTest, SecurityConfigTest

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.5 | UsuarioRepositoryTest.java | Integration (DataJpaTest) | N/A (new) | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.4 | UsuarioTest.java | Unit | ✅ 19/19 | ✅ Written | ✅ Passed | ✅ 2 cases | ✅ Clean |
| 1.3 | AuthDtosTest.java | Unit | ✅ 21/21 | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.2 | SessionServiceTest.java | Unit (Mockito) | ✅ 24/24 | ✅ Written | ✅ Passed | ✅ 6 cases | ✅ Clean |
| 1.1 | AuthControllerTest.java | Integration (WebMvcTest) | ✅ 30/30 | ✅ Written | ✅ Passed | ✅ 9 cases | ✅ Clean |
| 1.6 | SecurityConfigTest.java | Integration (WebMvcTest) | ✅ 39/39 | ✅ Written | ✅ Passed | ✅ 3 cases | ✅ Clean |
| 1.7 | N/A (config) | Config | ✅ 42/42 | N/A | ✅ Config | N/A | ✅ Clean |
| 1.8 | SessionServiceTest.java | Unit | ✅ (covered by 1.2) | ✅ Written | ✅ Passed | ✅ (covered) | ✅ Clean |
| 1.9 | AuthControllerTest.java | Integration | ✅ (covered by 1.1) | ✅ Written | ✅ Passed | ✅ (covered) | ✅ Clean |

## Test Summary
- **Total tests written**: 26 (new tests in this batch)
- **Total tests passing**: 42 (all tests including pre-existing)
- **Layers used**: Unit (11), Integration/DataJpaTest (3), Integration/WebMvcTest (12)
- **Pure functions created**: 0 (service methods are stateful)
- **Approval tests**: None — no refactoring of existing code

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/src/main/java/.../presentation/AuthController.java` | Created | Login, logout, me endpoints |
| `backend/src/main/java/.../presentation/LoginRequest.java` | Created | Login request DTO with validation |
| `backend/src/main/java/.../presentation/LoginResponse.java` | Created | Login response DTO with RolDto |
| `backend/src/main/java/.../application/SessionService.java` | Created | Session management (create/validate/invalidate) |
| `backend/src/main/java/.../infrastructure/UsuarioRepository.java` | Created | JPA repository for Usuario |
| `backend/src/main/java/.../domain/model/Usuario.java` | Modified | Added passwordResetToken + passwordResetTokenExpiry fields |
| `backend/src/main/java/.../infrastructure/SecurityConfig.java` | Modified | Added auth permit rules, session management, OAuth2 disable, PasswordEncoder bean |
| `backend/src/main/resources/application.yml` | Modified | Added session cookie config (SESSIONID, httpOnly, sameSite, secure) |
| `backend/pom.xml` | Modified | Added H2 test dependency, spring-security-test |
| `backend/src/test/resources/application.yml` | Created | Test DB config (H2, create-drop) |
| `backend/src/test/java/.../UsuarioRepositoryTest.java` | Created | Repository tests |
| `backend/src/test/java/.../UsuarioTest.java` | Created | Entity field tests |
| `backend/src/test/java/.../AuthDtosTest.java` | Created | DTO tests |
| `backend/src/test/java/.../SessionServiceTest.java` | Created | Service unit tests |
| `backend/src/test/java/.../AuthControllerTest.java` | Created | Controller integration tests |
| `backend/src/test/java/.../SecurityConfigTest.java` | Created | Security config tests |

## Deviations from Design
None — implementation matches design.

## Issues Found
- The `spring-boot-starter-oauth2-resource-server` dependency creates a competing SecurityFilterChain with CSRF enabled. The fix was to add `http.oauth2ResourceServer(oauth2 -> oauth2.disable())` in SecurityConfig and use `@Order(1)` to ensure our filter chain takes precedence. The CSRF issue was identified via Spring Security debug logging.

## Remaining Tasks
- [ ] 2.1 Create PasswordResetService.java
- [ ] 2.2 Create PasswordResetController.java
- [ ] 2.3 Add email dispatch integration
- [ ] 2.4 Create BackfillMigrationController.java
- [ ] 2.5–2.7 Write tests for Phase 2
- [ ] 3.1–3.8 Next consumes Spring session (Phase 3)
- [ ] 4.1–4.9 Decommission Prisma auth (Phase 4)

## Workload / PR Boundary
- Mode: chained PR slice (feature-branch-chain)
- Current work unit: PR 1 — Spring Auth Foundation
- Boundary: All backend auth endpoints (login, logout, me), SessionService, UsuarioRepository, SecurityConfig session auth, session cookie config, and all related tests
- Estimated review budget impact: ~380 changed lines (within 400 budget)
