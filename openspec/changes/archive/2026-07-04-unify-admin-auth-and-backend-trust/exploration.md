## Exploration: unify-admin-auth-and-backend-trust

### Current State
Admin auth is still Next-owned. `/admin/signin` calls NextAuth Credentials (`src/app/admin/signin/page.tsx`, `src/lib/auth.ts`), which validates a Prisma `User` with `role === 'ADMIN'`, compares `passwordHash` with bcrypt, and issues an 8-hour JWT session cookie. `/admin/**` page access is guarded by `withAuth` in `src/proxy.ts`, while backend route handlers repeat `await auth()` plus `session.user.role === 'ADMIN'` checks per endpoint. Password reset is also Next-owned: `src/app/api/auth/forgot-password/route.ts` creates Prisma `PasswordResetToken` records and emails links, and `src/app/api/auth/reset-password/route.ts` rotates the Prisma password hash. Spring does not authenticate end users today. `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` only checks a shared `X-Backend-Api-Key` header for `/api/v1/vacancies/**`, and `src/lib/server/springBackend.ts` is the Next-side contract that injects that token from `BACKEND_INTERNAL_API_TOKEN`. Spring has `Usuario`/`Rol` entities and an OAuth2 resource server dependency, but no login, session, password reset, or user-level authorization flow is wired in code.

### Affected Areas
- `src/lib/auth.ts` — Prisma-backed admin credential validation, JWT/session shaping, NextAuth ownership of identity.
- `src/app/api/auth/[...nextauth]/route.ts` — exposes the NextAuth login/session entrypoint.
- `src/app/admin/signin/page.tsx` — admin login UI posts directly to NextAuth credentials.
- `src/proxy.ts` — protects `/admin/**` pages with NextAuth middleware, not Spring trust.
- `src/app/api/auth/forgot-password/route.ts` — password reset issuance is owned by Next + Prisma.
- `src/app/api/auth/reset-password/route.ts` — password reset completion updates Prisma `User.passwordHash`.
- `src/lib/adminUsers.ts` and `prisma/schema.prisma` — admin identity/password lifecycle is stored in Prisma `User`/`PasswordResetToken`.
- `src/app/api/admin/**`, `src/app/api/vacancies/**`, `src/app/api/applications/**`, `src/app/api/contacts/**` — authorization is duplicated route-by-route with `auth()` and `ADMIN` role checks.
- `src/lib/server/springBackend.ts` — Next injects the shared backend trust header and decides when missing token is fatal.
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` — Spring trusts only the shared internal header for vacancy endpoints and has no end-user auth model.
- `backend/src/main/java/com/meinardi/rrhh/domain/model/Usuario.java` and `backend/src/main/resources/application.yml` — backend has a user entity model, but it is not the active runtime auth source.
- `backend/pom.xml` — OAuth2 resource-server dependency exists, but the current security config does not use it.

### Approaches
1. **Keep Next as auth authority and relay identity to Spring** — preserve NextAuth/Prisma login, then make Next forward trusted user context to Spring alongside the internal service token.
   - Pros: smaller first implementation slice, minimal admin UI disruption, can unlock Spring authorization checks quickly.
   - Cons: Spring still would not own authentication or password lifecycle, trust would depend on Next-signed forwarding conventions, route ownership stays split, and the target “frontend-only Next” architecture remains incomplete.
   - Effort: Medium

2. **Move admin auth ownership to Spring and let Next become a thin session relay** — Spring owns login, password reset, user/role authorization, and issues the authoritative backend session/token; Next only renders UI and forwards/consumes that backend session.
   - Pros: matches the target architecture, makes Spring the single policy owner, removes Prisma/NextAuth as the identity source of truth, and gives later domain migrations a consistent trust contract.
   - Cons: larger first slice, requires defining the backend auth mechanism, user store strategy, and migration path for existing admin accounts before implementation.
   - Effort: High

### Recommendation
Recommend **Approach 2**, specifically a **Spring-owned admin session model with Next as a temporary BFF/relay, not as the identity authority**. The key point is NOT whether the browser ultimately sees an opaque session cookie or a backend-issued token; the key point is that Spring must become the issuer and validator of admin identity, roles, and password lifecycle. For this repo, the safer path is a backend-owned session/cookie contract first, because the current admin UI already assumes same-site web auth and many calls still pass through Next route handlers.

Before implementation, the proposal/spec work should explicitly decide:
- the canonical admin user store during and after migration (`Prisma User` reuse vs Spring-owned schema/table strategy);
- the authoritative credential/password reset implementation in Spring, including hashing and token storage;
- the trust shape between Next and Spring during migration (forward backend cookie/session vs backend-issued bearer token);
- whether Next admin route handlers remain temporary BFF adapters or are reduced immediately in the same change;
- how Spring will express authorization claims/roles so current `ADMIN` checks map cleanly.

Proposed change boundary for proposal/spec work: **establish a backend-owned admin trust contract and migrate only the auth foundation** — login, session validation, password reset ownership, Spring-side authorization primitives, and the minimal Next integration needed to consume that new trust model. Do **not** include broader admin domain migrations, vacancy fallback cleanup, or schema-wide convergence beyond what auth absolutely needs.

### Risks
- Existing admin access can break if NextAuth is removed before Spring login/session validation and role mapping are fully working.
- User/schema mismatch is a hard dependency: Prisma `User`/`PasswordResetToken` does not match Spring `Usuario`/`Rol` today.
- A “temporary” forwarded-identity bridge can become permanent accidental architecture if proposal/spec does not declare it transitional.
- Mixed trust during migration can create double-authorization bugs, especially while some Next route handlers still check `session.user.role === 'ADMIN'` and Spring starts checking its own claims.
- Cookie/session topology must be decided early if Next and Spring will live on different origins in production.

### Ready for Proposal
Yes — proceed with proposal/spec work bounded to the auth foundation only: backend-owned admin login/session/password reset, Spring authorization primitives, Next integration as consumer/relay, and a clear migration plan for current Prisma-backed admin accounts. Keep vacancy/application/contact/admin-domain moves out of this change.
