# Tasks: Unify Admin Auth and Backend Trust

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Spring auth foundation: session, login, me, logout, SecurityConfig update | PR 1 | Base = feature branch. Backend-only; no Next changes. Tests included. |
| 2 | Spring password reset + backfill migration endpoint | PR 2 | Base = PR 1 branch. Backend-only. Depends on PR 1 session service. |
| 3 | Next consumes Spring session: relay, proxy, signin UI, NextAuth disable | PR 3 | Base = PR 2 branch. Next-only changes. Depends on Spring endpoints from PR 1+2. |
| 4 | Decommission Prisma auth: remove old routes, dormant tables, cleanup | PR 4 | Base = PR 3 branch. Cleanup after production verification. |

---

## Phase 1: Spring Auth Foundation (PR 1)

- [x] 1.1 Create `backend/.../presentation/AuthController.java` — login, logout, me endpoints per admin-session spec
- [x] 1.2 Create `backend/.../application/SessionService.java` — session creation, validation, invalidation (HttpSession-backed)
- [x] 1.3 Create `backend/.../presentation/LoginRequest.java` and `LoginResponse.java` DTOs
- [x] 1.4 Add `passwordResetToken` + `passwordResetTokenExpiry` fields to `backend/.../domain/model/Usuario.java`
- [x] 1.5 Create `backend/.../infrastructure/UsuarioRepository.java` — JPA repository for `Usuario` (findByEmail)
- [x] 1.6 Modify `backend/.../infrastructure/SecurityConfig.java` — add `/api/v1/auth/**` permit rules, session-based ADMIN role enforcement on `/api/v1/admin/**` and write operations
- [x] 1.7 Modify `backend/src/main/resources/application.yml` — add session cookie config (SESSIONID, httpOnly, sameSite, secure)
- [x] 1.8 Write Spring unit tests for `SessionService` (login success/failure, session validation, logout invalidation)
- [x] 1.9 Write Spring integration test for login→me→logout flow via MockMvc

## Phase 2: Password Reset + Backfill (PR 2)

- [x] 2.1 Create `backend/.../application/PasswordResetService.java` — token generation, expiry validation, hash rotation
- [x] 2.2 Create `backend/.../presentation/PasswordResetController.java` — forgot-password + reset-password endpoints per spec
- [x] 2.3 Add email dispatch integration to `PasswordResetService` (Spring `JavaMailSender` or stub for now)
- [x] 2.4 Create `backend/.../presentation/BackfillMigrationController.java` — secured endpoint reading Prisma User rows into Usuario/Rol
- [x] 2.5 Write Spring unit tests for `PasswordResetService` (token gen, expiry, reuse prevention, hash rotation)
- [x] 2.6 Write integration test for forgot-password→reset-password cycle via MockMvc
- [x] 2.7 Write integration test for backfill endpoint (idempotent, duplicate skip, hash passthrough)

## Phase 3: Next Consumes Spring Session (PR 3)

- [x] 3.1 Create `src/lib/springSession.ts` — `getSpringSession()` calling Spring `/api/v1/auth/me` with forwarded SESSIONID cookie
- [x] 3.2 Modify `src/lib/auth.ts` — replace `authorizeAdminCredentials` Prisma check with Spring relay; keep `auth()` export signature
- [x] 3.3 Modify `src/proxy.ts` — replace `withAuth` from next-auth with SESSIONID cookie forwarding to Spring `/api/v1/auth/me`
- [x] 3.4 Modify `src/app/admin/signin/page.tsx` — POST to Spring `/api/v1/auth/login` instead of `signIn('credentials')`
- [x] 3.5 Modify `src/app/api/auth/[...nextauth]/route.ts` — disable Credentials provider (keep route for potential future providers)
- [x] 3.6 Modify `src/lib/adminUsers.ts` — write to Spring `Usuario` via backend API instead of Prisma `User`
- [x] 3.7 Add feature flag env var (e.g. `SPRING_AUTH_ENABLED`) to toggle between NextAuth and Spring relay
- [x] 3.8 Write Playwright E2E test: admin login via Spring session, page access, logout

## Phase 4: Decommission Prisma Auth (PR 4)

- [x] 4.1 Delete `src/app/api/auth/forgot-password/route.ts`
- [x] 4.2 Delete `src/app/api/auth/reset-password/route.ts`
- [x] 4.3 Remove `authorizeAdminCredentials` and Credentials provider from `src/lib/auth.ts`
- [x] 4.4 Remove `bcrypt` import and Prisma User auth queries from `src/lib/auth.ts`
- [x] 4.5 Mark Prisma `User`/`PasswordResetToken` as dormant (add comments, keep for audit FK integrity)
- [x] 4.6 Remove backfill migration endpoint from Spring (one-time use)
- [x] 4.7 Update `src/lib/adminUsers.ts` to use Spring-only user creation path
- [x] 4.8 Verify existing `npm run test:e2e:matrix` passes with Spring-only auth
- [x] 4.9 Document rollback procedure: re-enable NextAuth Credentials via env toggle
