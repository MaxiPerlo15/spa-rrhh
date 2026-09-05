## Exploration: Spring-session authorization for dashboard reads

### Current State
At `96058e6`, `SPRING_AUTH_ENABLED=true` disables the Credentials provider, but the dashboard-list BFFs still authorize with NextAuth only:

- `GET /api/vacancies?all=true` checks `auth()` before listing all vacancies; `all=false` is public and must remain untouched.
- `GET /api/applications` and `GET /api/contacts` always check `auth()` before their Spring list calls.

The established session boundary (`getSpringSession()` plus `relaySpringCookies()`) validates `SESSIONID`, checks `admin:access`, carries a rotated validation cookie (`S1`) upstream, and appends it to browser responses. Notification BFFs use this successfully. The three reads do not forward `SESSIONID` or preserve `Set-Cookie`; their Spring calls currently rely only on the internal API key. In legacy mode, NextAuth admin authorization must remain the fallback.

Route contracts to preserve in Spring mode are: missing/anonymous session -> `401` (`No autorizado`, including an expiry `Set-Cookie`); non-admin -> `403` (`No autorizado`); validation/backend unavailable -> `503` (`Spring backend unavailable`). After a successful preflight, local validation, missing-backend, network-`503`, and upstream responses must retain validation `S1`; upstream `Set-Cookie` values must be appended, not replace `S1`. Existing route-specific behavior otherwise stays intact: vacancy missing backend is `503` before protected `all=true` authorization, while application/contact authorize before their configured-backend check; application/contact propagate upstream `401`/`403`, while vacancy-list upstream failures currently fall through its existing `500` catch.

### Affected Areas
- `src/app/api/vacancies/route.ts` — migrate only the protected `GET ?all=true` branch; retain public listing and POST behavior.
- `src/app/api/applications/route.ts` — migrate only admin list GET; retain public POST behavior.
- `src/app/api/contacts/route.ts` — migrate only admin list GET; retain public POST behavior.
- `src/lib/server/adminBffBoundary.ts` (or a focused sibling) — add a reusable dual-mode dashboard-read authorizer returning the upstream cookie plus response cookie, instead of triplicating mode and cookie logic.
- `src/lib/__tests__/vacancyRoute.test.ts`, `src/lib/__tests__/applicationsListRoute.test.ts`, `src/lib/__tests__/contactsRoute.test.ts` — add route contracts for Spring authorization, rotation relay, and NextAuth fallback.
- `tests/e2e/auth-spring-session.spec.ts` — prove each first dashboard read works immediately after Spring relay login.
- `tests/e2e/api-smoke.spec.ts`, `tests/e2e/spring-application-flow.spec.ts` — existing public-vacancy and unauthenticated-list assertions remain valid; no change required.

### Approaches
1. **Shared dual-mode read authorizer in the BFF boundary** — when Spring auth is enabled, validate `SESSIONID`, derive the rotated cookie for the Spring request, and relay cookies; otherwise use current NextAuth admin validation.
   - Pros: one authorization/status/rotation contract across all three reads; minimizes future drift; preserves legacy mode explicitly.
   - Cons: adds a small shared server helper and requires route-level contract coverage.
   - Effort: Medium.

2. **Repeat conditional authorization in each route** — inline Spring-vs-NextAuth branching and cookie relay separately.
   - Pros: no new helper abstraction.
   - Cons: three copies of security-sensitive status and cookie behavior; likely to drift as notification routes did.
   - Effort: Medium.

### Recommendation
Use approach 1. Preserve each route's current validation/configuration ordering and payload mapping, but replace only its dashboard-read authorization branch. In Spring mode, pass `Cookie: SESSIONID=S1` (or the original `S0` when unrotated) alongside `X-Backend-Api-Key`, append both preflight and upstream cookies, and use no session preflight in legacy mode.

The likely 320–380-line change exceeds the requested 300-line ceiling. Split it into two chained corrective work units:

1. **Foundation + vacancies/applications** — shared authorizer, the protected vacancy/application list branches, their focused tests, and first-read E2E coverage for both (about 220–270 lines).
2. **Contacts** — contact-list adoption, its focused tests, and its first-read E2E coverage (about 90–130 lines).

### Risks
- Treating Spring unavailability as a legacy fallback would silently bypass the active Spring security authority; fallback is only when `SPRING_AUTH_ENABLED !== 'true'`.
- Replacing rather than appending `Set-Cookie` loses either the rotated session or an independent upstream cookie.
- Expanding vacancy authorization beyond `all=true` would break the public vacancy listing and API smoke contract.
- The current contact status query is not forwarded upstream; that unrelated behavior must not be changed in this corrective slice.

### Ready for Proposal
Yes — propose two chained, read-only BFF authorization slices. No Spring controller/security change, mutation change, Prisma work, or browser API shape change is needed.
