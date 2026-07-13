# admin-session Specification

## Purpose

Spring becomes the sole owner of admin login, session issuance, session validation, and logout. Next demotes to a thin BFF relay that consumes the Spring-issued session cookie.

## Non-Goals

- Vacancy, application, contact, or candidate domain migration
- Admin operations (notifications, audit, settings) migration to Spring
- Public user authentication (no public users exist)
- Schema-wide Prisma/JPA alignment beyond auth entities

## Requirements

### Requirement: Spring Login Endpoint

Spring SHALL expose `POST /api/v1/auth/login` accepting credential JSON. On valid credentials it MUST return a `Set-Cookie: SESSIONID` header (HttpOnly, SameSite=Lax, Secure in production) and a JSON body with `userId`, `email`, `nombreUsuario`, and `rol`.

#### Scenario: Successful login

- GIVEN a valid email and password in the request body
- WHEN the client POSTs to `/api/v1/auth/login`
- THEN the response is 200 with `userId`, `email`, `nombreUsuario`, `rol` fields
- AND the response includes a `Set-Cookie: SESSIONID` header

#### Scenario: Invalid credentials

- GIVEN an incorrect email or password
- WHEN the client POSTs to `/api/v1/auth/login`
- THEN the response is 401 with no user information leaked

#### Scenario: Missing required fields

- GIVEN the request body is missing `email` or `password`
- WHEN the client POSTs to `/api/v1/auth/login`
- THEN the response is 400 with a validation error

### Requirement: Session Validation via /me

Spring SHALL expose `GET /api/v1/auth/me` requiring a valid `SESSIONID` cookie. It MUST return the current user profile or 401.

#### Scenario: Valid session

- GIVEN a browser holds a valid `SESSIONID` cookie
- WHEN the client GETs `/api/v1/auth/me`
- THEN the response is 200 with `userId`, `email`, `nombreUsuario`, and `rol` (including `id`, `nombre`, `permisos`)

#### Scenario: Missing or expired session

- GIVEN no `SESSIONID` cookie is present or the session has expired
- WHEN the client GETs `/api/v1/auth/me`
- THEN the response is 401

### Requirement: Session Invalidation via Logout

Spring SHALL expose `POST /api/v1/auth/logout` requiring a valid session. It MUST invalidate the session server-side and clear the cookie.

#### Scenario: Successful logout

- GIVEN a browser holds a valid `SESSIONID` cookie
- WHEN the client POSTs to `/api/v1/auth/logout`
- THEN the response is 204
- AND subsequent calls to `/api/v1/auth/me` return 401

### Requirement: Next BFF Relay

Next route handlers under `src/app/api/admin/**` SHALL forward the `SESSIONID` cookie to Spring `/api/v1/auth/me` for auth checks. Next admin page access (`/admin/**`) SHALL validate the Spring session before serving.

#### Scenario: Admin page access with valid Spring session

- GIVEN a browser holds a valid `SESSIONID` cookie
- WHEN the client requests `/admin/dashboard`
- THEN Next forwards the cookie to Spring `/api/v1/auth/me`
- AND Spring returns 200 with user data
- AND Next serves the admin page

#### Scenario: Admin page access without session

- GIVEN no valid `SESSIONID` cookie is present
- WHEN the client requests `/admin/dashboard`
- THEN the user is redirected to `/admin/signin`

### Requirement: Admin Login UI Relay

The admin signin page (`src/app/admin/signin/page.tsx`) SHALL POST credentials directly to Spring `POST /api/v1/auth/login` instead of NextAuth.

#### Scenario: Login UI submits to Spring

- GIVEN a user enters email and password on `/admin/signin`
- WHEN the form is submitted
- THEN the browser POSTs to `/api/v1/auth/login`
- AND on success the user is redirected to `/admin`

### Requirement: NextAuth Credentials Provider Disabled

After Spring login is verified, the NextAuth Credentials provider SHALL be disabled. The `[...nextauth]` route MAY remain for potential future providers.

#### Scenario: Credentials provider inactive

- GIVEN Spring login is operational in production
- WHEN an admin attempts login via NextAuth Credentials
- THEN the request is rejected or ignored (no credential provider active)

### Requirement: Prisma Auth Dormancy

Prisma `User` and `PasswordResetToken` tables SHALL remain populated during migration for rollback safety. No new auth queries SHALL read from Prisma `User` after the relay is active.

#### Scenario: No Prisma auth reads during admin session flow

- GIVEN the Spring session relay is active
- WHEN an admin logs in or accesses a protected page
- THEN no Prisma `User` query is executed for credential or role resolution

### Requirement: Rollback Safety

The rollback plan MUST allow re-enabling the NextAuth Credentials provider via a single config toggle and redeploy without data loss.

#### Scenario: Rollback re-enables NextAuth

- GIVEN Spring session is disabled and NextAuth Credentials is re-enabled
- WHEN an admin visits `/admin/signin`
- THEN login functions through NextAuth with existing Prisma `User` credentials
