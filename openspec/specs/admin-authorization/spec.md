# admin-authorization Specification

## Purpose

Spring enforces role-based authorization on its own endpoints using session claims derived from the `Rol` entity. Next consumes role information from the Spring session relay for UI-level gating. The `Rol`-based model with `@PreAuthorize` replaces ad-hoc header-only trust.

## Non-Goals

- Vacancy, application, or contact domain authorization migration
- ACL or fine-grained permission system beyond role checks
- Admin domain operations (notifications, audit, settings) authorization

## Requirements

### Requirement: Spring Role Enforcement

Spring `SecurityConfig` SHALL enforce `ADMIN` role on protected endpoints using the `Rol` claim from the session. Endpoints under `/api/v1/admin/**` and `/api/v1/vacancies/**` (write operations) MUST require an active session with a role that includes the `ADMIN` permission.

#### Scenario: Admin accesses protected endpoint with valid session

- GIVEN an admin has an active `SESSIONID` with role `ADMIN`
- WHEN the admin requests `GET /api/v1/admin/notifications`
- THEN the response is 200 (authorization passes)

#### Scenario: Non-admin or missing role

- GIVEN a session exists but the role does not include `ADMIN`
- WHEN the client requests `GET /api/v1/admin/notifications`
- THEN the response is 403

#### Scenario: Unauthenticated request

- GIVEN no `SESSIONID` cookie is present
- WHEN a client requests `GET /api/v1/admin/notifications`
- THEN the response is 401

### Requirement: Role Claim Structure

The session `me` response SHALL include a `rol` object with `id`, `nombre`, and `permisos` (array of permission strings). The `permisos` array MUST be the source of truth for authorization decisions on Spring endpoints.

#### Scenario: Role includes permissions array

- GIVEN an admin with role `ADMIN` and permissions `["vacancies:read", "vacancies:write", "users:read"]`
- WHEN the client calls `GET /api/v1/auth/me`
- THEN the response includes `rol.permisos` containing all three strings

### Requirement: Next Role Gating from Session

Next admin pages SHALL derive the user's role from the Spring session relay response (`/api/v1/auth/me`). Next MUST NOT independently query Prisma for role resolution.

#### Scenario: UI gates on Spring role

- GIVEN a Spring session returns `rol.nombre = "ADMIN"`
- WHEN the admin navigates to `/admin/dashboard`
- THEN the page renders (role gate passes)
- AND no Prisma `User` or `Role` query is executed

#### Scenario: UI rejects non-admin session

- GIVEN a Spring session returns a role without `ADMIN`
- WHEN the admin navigates to `/admin/dashboard`
- THEN the user is redirected to `/admin/signin` or shown an access-denied page

### Requirement: Backward Compatibility with X-Backend-Api-Key

During the migration window, Spring endpoints SHALL continue to accept `X-Backend-Api-Key` header for internal service-to-service calls from Next. This header-based trust MUST be removed after all Next admin route handlers are migrated or decommissioned.

#### Scenario: Internal header still accepted

- GIVEN a request includes `X-Backend-Api-Key` but no session cookie
- WHEN the request targets `/api/v1/vacancies` (read)
- THEN the endpoint processes the request (legacy trust path)

#### Scenario: Session takes precedence over header

- GIVEN a request includes both `SESSIONID` cookie and `X-Backend-Api-Key`
- WHEN Spring evaluates authorization
- THEN session-based role is used; the header is ignored for authorization

### Requirement: User Migration to Spring Usuario

A backfill migration script (or secured endpoint) MUST copy existing Prisma `User` records into Spring `Usuario`/`Rol` tables before Spring login is enabled. Password hashes are bcrypt-compatible and SHALL be transferred without rehashing.

#### Scenario: Backfill migrates all admin users

- GIVEN Prisma `User` has 3 admin records with bcrypt hashes
- WHEN the backfill script runs
- THEN 3 `Usuario` records are created in Spring
- AND password hashes are identical (no rehash)
- AND the script reports migrated count and skips duplicates

#### Scenario: Backfill is idempotent

- GIVEN the backfill has already run once
- WHEN the backfill script runs again
- THEN existing `Usuario` records are not duplicated
- AND skipped-duplicate count is reported

### Requirement: Authorization Migration Phasing

Spring authorization via session MUST be active and verified before NextAuth role checks are removed. During the mixed-trust window, both Spring and Next role checks MAY be active simultaneously to prevent gaps.

#### Scenario: Mixed-trust window

- GIVEN Spring session-based authorization is deployed but NextAuth role checks are still in place
- WHEN an admin accesses an endpoint protected by both
- THEN authorization passes if either check succeeds
- AND no double-denial occurs for a valid admin session
