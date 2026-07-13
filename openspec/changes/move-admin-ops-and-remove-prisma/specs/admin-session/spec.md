# Delta for admin-session

## ADDED Requirements

### Requirement: SecurityContext Session Bridge

Spring MUST treat `rol.permisos` as the authorization source; `rol.nombre` is display-only. `admin:access` is the canonical admin authority. For every request, `SessionAuthenticationFilter` MUST create an empty context, revalidate `SESSIONID` against the current user, role, and permissions, install `admin:access` before authorization, and clear the context in `finally`. A missing, expired, malformed, deleted, or disabled-session identity MUST invalidate its server session, expire the cookie where possible, and remain anonymous.

Next's `/admin/**` proxy MUST call `/api/v1/auth/me` and require `rol.permisos` to contain `admin:access`; it MUST NOT trust `rol.nombre`. It MUST redirect anonymous UI requests to sign-in, render/return 403 for an authenticated non-admin, and surface an unavailable Spring session service as 503 rather than a false logout.

#### Scenario: Valid session is bridged and revalidated
- GIVEN `SESSIONID` resolves to a current user with `admin:access`
- WHEN a request enters the filter before authorization
- THEN Spring installs that authority and clears it after the response

#### Scenario: Stale session is cleaned up
- GIVEN a session references a deleted user or removed permission
- WHEN the filter revalidates the request
- THEN it invalidates the session and the protected endpoint returns 401

#### Scenario: Session service is unavailable to the proxy
- GIVEN `/api/v1/auth/me` cannot be reached
- WHEN Next evaluates an admin request
- THEN it returns 503 and does not redirect or use NextAuth
