# Delta for admin-session

## ADDED Requirements

### Requirement: SecurityContext Session Bridge

Spring MUST treat `rol.permisos` as the authorization source; `rol.nombre` is display-only. `admin:access` is the canonical admin authority. For every request, `SessionAuthenticationFilter` MUST create an empty context, revalidate `SESSIONID` against the current user, role, and permissions, install `admin:access` before authorization, and clear the context in `finally`. A missing, expired, malformed, deleted, or disabled-session identity MUST invalidate its server session, expire the cookie where possible, and remain anonymous.

When Spring auth is enabled, the browser MUST submit credentials only to Next's same-origin Spring login relay. Next MUST relay the request to Spring, return Spring's `Set-Cookie` on the same-origin response, and forward the browser `SESSIONID` to Spring for logout before relaying Spring's clearing `Set-Cookie`. The browser MUST NOT call Spring's login or logout endpoint directly. Next's `/admin/**` proxy MUST call `/api/v1/auth/me` and require `rol.permisos` to contain `admin:access`; it MUST NOT trust `rol.nombre`. It MUST redirect anonymous UI requests to sign-in, render/return 403 for an authenticated non-admin, and surface an unavailable Spring session service as 503 rather than a false logout. `SPRING_AUTH_ENABLED` and `NEXT_PUBLIC_SPRING_AUTH_ENABLED` MUST have matching boolean values so the proxy and browser use the same authentication mode.

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

#### Scenario: Same-origin relay owns browser cookie handoff
- GIVEN Spring auth is enabled and an administrator submits valid credentials
- WHEN the browser posts to Next's Spring login relay
- THEN Next relays Spring's session cookie on its own response and `/admin` renders authenticated admin content rather than sign-in or a not-found page

#### Scenario: Spring auth flags are misaligned
- GIVEN `SPRING_AUTH_ENABLED` and `NEXT_PUBLIC_SPRING_AUTH_ENABLED` differ
- WHEN Next validates runtime configuration
- THEN startup fails before the proxy and browser can select contradictory auth modes
