# Delta for admin-authorization

## MODIFIED Requirements

### Requirement: Spring Role Enforcement

Spring `SecurityConfig` SHALL enforce `admin:access` on `/api/v1/admin/**` and protected writes. `rol.nombre`, including `ADMIN`, MUST NOT independently authorize a request. A missing, invalid, or expired session MUST map to 401; an authenticated principal without `admin:access` MUST map to 403. Next MUST preserve those statuses and return 503, not a Prisma or NextAuth fallback, when Spring is unavailable.
(Previously: Authorization ambiguously combined the role name and permission list.)

#### Scenario: Permission-authorized admin
- GIVEN a bridged session whose permissions include `admin:access`
- WHEN it requests `GET /api/v1/admin/notifications`
- THEN Spring returns 200

#### Scenario: Role label without authority is denied
- GIVEN an authenticated session named `ADMIN` without `admin:access`
- WHEN it requests an admin endpoint
- THEN Spring returns 403

#### Scenario: Anonymous request is denied
- GIVEN no valid `SESSIONID`
- WHEN a client requests an admin endpoint
- THEN Spring returns 401

### Requirement: Next Role Gating from Session

Next admin pages SHALL derive authorization from Spring `/api/v1/auth/me`. Next MUST require `rol.permisos` to contain `admin:access` and MUST NOT query Prisma or use `rol.nombre` for role resolution.
(Previously: The UI gate used `rol.nombre = "ADMIN"`.)

#### Scenario: UI gate accepts the canonical authority
- GIVEN `/api/v1/auth/me` returns `rol.permisos` including `admin:access`
- WHEN the user navigates to `/admin/dashboard`
- THEN Next serves the page without a Prisma query

#### Scenario: UI gate rejects an insufficient session
- GIVEN `/api/v1/auth/me` returns no `admin:access`
- WHEN the user navigates to `/admin/dashboard`
- THEN Next returns an access-denied response instead of serving the page
