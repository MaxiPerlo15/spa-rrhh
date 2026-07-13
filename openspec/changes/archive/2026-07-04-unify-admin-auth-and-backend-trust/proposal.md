# Proposal: Unify Admin Auth and Backend Trust

## Intent

Admin authentication is currently owned by Next.js (NextAuth + Prisma `User`/`PasswordResetToken`), while Spring has no wired auth flow despite having `Usuario`/`Rol` entities and an OAuth2 dependency. This split means Spring cannot enforce its own authorization policy, and every domain migration inherits a split trust model. This change establishes Spring as the single owner of admin login, session, password reset, and role-based authorization, with Next demoted to a thin consumer/relay.

## Scope

### In Scope
- Spring-owned admin login endpoint (credential validation, session/token issuance)
- Spring-owned password reset flow (token generation, email delivery, hash rotation)
- Spring-side role/authorization model wired into `SecurityConfig`
- Backend session or token contract between Spring and Next
- Minimal Next integration: relay/consume backend session for admin pages
- Prisma-to-Spring admin user migration strategy (backfill `Usuario` table from existing `User` data)
- Decouple NextAuth admin credential checks; remove NextAuth Credentials provider usage

### Out of Scope
- Vacancy, application, contact, or candidate domain migrations
- Admin operations (notifications, audit, settings) migration to Spring
- Schema-wide Prisma/JPA alignment beyond auth entities
- Public user auth (no public users exist in this system)
- Frontend-only Next deployment posture or direct DB decoupling

## Capabilities

### New Capabilities
- `admin-session`: Spring-owned admin login, session management, and token/cookie lifecycle
- `admin-password-reset`: Spring-owned password reset issuance and completion
- `admin-authorization`: Spring-side role/claim enforcement and authorization model

### Modified Capabilities
- None (no existing specs in `openspec/specs/`)

## Approach

**Spring-owned session with Next as BFF relay.**

1. **User store**: Backfill Spring `Usuario`/`Rol` from Prisma `User` during migration; Prisma becomes read-only legacy, Spring table becomes source of truth.
2. **Login**: Spring exposes `POST /api/v1/auth/login` — validates credentials against its own `Usuario`, issues an HttpOnly session cookie (or backend-signed JWT if cross-origin needed).
3. **Password reset**: Spring owns token generation, email sending, and hash rotation via `Usuario` entity. Prisma `PasswordResetToken` and `User.passwordHash` become inactive.
4. **Authorization**: Spring `SecurityConfig` enforces `ADMIN` role on protected endpoints using session claims, not just the `X-Backend-Api-Key` header.
5. **Next relay**: Next route handlers (`src/app/api/admin/**`) forward the backend session cookie to Spring for auth checks, or are progressively replaced by direct Spring endpoints. `src/proxy.ts` validates against the Spring-issued session instead of NextAuth.
6. **NextAuth removal**: Credentials provider disabled after Spring login is verified. NextAuth session cookie replaced by relay to Spring session.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/main/java/.../SecurityConfig.java` | Modified | Add login endpoint, session management, role enforcement |
| `backend/src/main/java/.../Usuario.java` | Modified | Active auth entity; backfill from Prisma |
| `backend/src/main/resources/application.yml` | Modified | Session/cookie config, email settings for reset |
| `src/lib/auth.ts` | Modified | Remove Prisma credential validation, relay to Spring |
| `src/app/admin/signin/page.tsx` | Modified | POST to Spring login instead of NextAuth |
| `src/proxy.ts` | Modified | Validate Spring-issued session instead of NextAuth |
| `src/app/api/auth/forgot-password/route.ts` | Removed | Delegates to Spring |
| `src/app/api/auth/reset-password/route.ts` | Removed | Delegates to Spring |
| `src/app/api/auth/[...nextauth]/route.ts` | Modified | Credentials provider disabled |
| `prisma/schema.prisma` | Modified | `User`/`PasswordResetToken` become dormant |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Admin lockout during migration | High | Phase: Spring login works before NextAuth is removed; blue-green cutover |
| Schema mismatch (Prisma `User` vs Spring `Usuario`) | Med | Backfill script verified in staging before production |
| Temporary BFF relay becomes permanent | Med | Proposal declares relay as transitional; design spec enforces removal timeline |
| Cookie/session topology if Next/Spring are on different origins | Low | Decide cross-origin strategy in design phase; same-origin for initial deploy |
| Double-authorization bugs during mixed-trust window | Med | Feature-flag Spring authorization; remove Next-side `auth()` checks incrementally |

## Rollback Plan

1. Re-enable NextAuth Credentials provider (single config toggle + redeploy).
2. Point admin login UI back to `api/auth/[...nextauth]`.
3. Prisma `User`/`PasswordResetToken` tables remain populated during migration window — no destructive data change until Spring login is verified in production.
4. Rollback is safe because Spring session is additive until NextAuth is removed.

## Dependencies

- Spring Boot backend must be deployed and reachable from Next runtime
- Email service configuration available in Spring `application.yml`
- Existing admin user credentials available for backfill verification

## Success Criteria

- [ ] Admin login flows through Spring; NextAuth Credentials provider is disabled
- [ ] Password reset issues/validates/rotates through Spring endpoints
- [ ] Spring `SecurityConfig` enforces `ADMIN` role on protected Spring endpoints
- [ ] Next admin pages relay Spring session correctly; no Prisma auth queries on admin path
- [ ] Backfill script migrates all existing admin users to Spring `Usuario` table
- [ ] Unit tests pass for Spring auth endpoints; integration test covers login+session+reset flow
- [ ] Rollback plan verified: re-enabling NextAuth works within 5 minutes
