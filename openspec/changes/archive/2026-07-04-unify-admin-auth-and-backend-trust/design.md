# Design: Unify Admin Auth and Backend Trust

## Technical Approach

Spring becomes the single owner of admin identity, credential validation, session issuance, and password lifecycle. Next demotes to a thin BFF relay that forwards the Spring-issued session cookie on admin API calls. The change proceeds in three phases: (1) Spring auth foundation + Prisma user backfill, (2) Next consumes Spring session, (3) NextAuth and Prisma auth tables decommissioned.

## Architecture Decisions

| Decision | Option A | Option B | Tradeoff | Choice |
|---|---|---|---|---|
| **Session mechanism** | Spring-issued opaque session cookie (server-side store) | Spring-issued signed JWT bearer | Cookie: simpler same-origin, httpOnly; JWT: stateless but needs rotation + revocation logic | **Cookie** — same-origin deploy, httpOnly security, simpler rollout |
| **Cookie topology** | Same-site cookie shared by Next→Spring on same domain | Cross-origin: separate cookies per origin, Next relays via Authorization header | Same-site: zero extra infra; Cross-origin: needed only if Next/Spring ever split domains | **Same-site first** — add cross-origin relay only if deployment topology requires it later |
| **User store authority** | New Spring `Usuario` table, backfill from Prisma `User` | Reuse Prisma `User` as source, Spring reads via shared DB | Prisma reuse keeps split trust; new Spring table establishes clean ownership | **New Spring `Usuario`/`Rol`** with backfill script |
| **Next auth integration** | Replace `auth()` with Spring-session forwarding, keep middleware | Full removal of NextAuth, rewrite proxy as raw cookie check | Replacement is incremental; full removal is high-risk in one shot | **Replace first, remove NextAuth later** |
| **Password hash format** | Spring uses bcrypt (same as Prisma) | Spring uses a different encoder (SCrypt, Argon2) | Same encoder = no dual-hash migration pain during transition | **Bcrypt first**, migrate encoder in a future change |
| **Authorization model** | Spring `Rol`-based with `@PreAuthorize` | Spring ACL or SpEL-only | `Rol`+`@PreAuthorize` is explicit, auditable, maps cleanly to current ADMIN checks | **`Rol`-based `@PreAuthorize`** |

## Spring Endpoints and Contracts

| Method | Path | Purpose | Auth Required | Response |
|--------|------|---------|---------------|----------|
| `POST` | `/api/v1/auth/login` | Validate credentials, issue session cookie | No | `{ "userId", "email", "nombreUsuario", "rol" }` + Set-Cookie |
| `POST` | `/api/v1/auth/logout` | Invalidate session | Yes (session cookie) | `204` |
| `GET` | `/api/v1/auth/me` | Return current user from session | Yes | `{ "userId", "email", "nombreUsuario", "rol": { "id", "nombre", "permisos" } }` |
| `POST` | `/api/v1/auth/forgot-password` | Issue reset token, send email | No | Generic message (no user enumeration) |
| `POST` | `/api/v1/auth/reset-password` | Validate token, rotate hash | No | `{ "message" }` |

Session cookie name: `SESSIONID`. HttpOnly, SameSite=Lax, Secure in production. Server-side session store: Spring `HttpSession` backed by a lightweight in-memory or database store (not Redis initially).

## Data Flow

```
Browser ──POST /api/v1/auth/login──→ Spring validates Usuario ──→ Set-Cookie SESSIONID
  │
  ├──GET /admin/*──→ Next middleware reads SESSIONID cookie
  │                   └──→ Forwards cookie to Spring GET /api/v1/auth/me
  │                         └──→ If valid: Next serves page; if 401: redirect /admin/signin
  │
  ├──GET /api/admin/**──→ Next route handler forwards SESSIONID to Spring
  │                        └──→ Spring validates session + checks ADMIN role
  │
  └──POST /api/v1/auth/forgot-password──→ Spring issues token, sends email
       └──POST /api/v1/auth/reset-password──→ Spring rotates hash
```

## User Migration Strategy

1. **Backfill script**: Spring `POST /api/v1/admin/migration/backfill` endpoint (secured with `X-Backend-Api-Key`) reads Prisma `User` rows and inserts into `usuario`/`rol` tables. Password hashes are bcrypt-compatible — no rehash needed.
2. **Verification**: Script reports migrated count, skipped duplicates, and hash-format mismatches.
3. **Dual-write window**: During transition, new admin accounts created via `npm run admin:create` write to Spring `Usuario` only. Prisma `User` table becomes read-only legacy.
4. **Decommission**: After Spring login is verified in production for 2+ weeks, disable Prisma auth queries entirely.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/.../SecurityConfig.java` | Modify | Add `/api/v1/auth/**` endpoints, session management, `ADMIN` role enforcement via `Rol` |
| `backend/.../Usuario.java` | Modify | Add `passwordResetToken` field for reset lifecycle |
| `backend/.../Rol.java` | Keep | Already has `nombre` + `permisos` — map `ADMIN` to Spring role name |
| `backend/src/main/resources/application.yml` | Modify | Add session cookie config, email settings for password reset |
| `backend/.../AuthController.java` | Create | Login, logout, me, forgot-password, reset-password endpoints |
| `backend/.../SessionService.java` | Create | Session creation/validation/invalidation logic |
| `backend/.../PasswordResetService.java` | Create | Token generation, hash rotation, email dispatch |
| `backend/.../BackfillMigrationController.java` | Create | One-time Prisma→Spring user migration endpoint |
| `src/lib/auth.ts` | Modify | Replace Prisma credential check with Spring `/api/v1/auth/me` relay; keep `auth()` export signature |
| `src/proxy.ts` | Modify | Read `SESSIONID` cookie and forward to Spring for `/admin/**` guard |
| `src/app/admin/signin/page.tsx` | Modify | POST to `/api/v1/auth/login` instead of `signIn('credentials')` |
| `src/app/api/auth/[...nextauth]/route.ts` | Modify | Disable Credentials provider (keep route for other providers if any) |
| `src/app/api/auth/forgot-password/route.ts` | Delete | Delegates to Spring; remove after migration |
| `src/app/api/auth/reset-password/route.ts` | Delete | Delegates to Spring; remove after migration |
| `src/lib/adminUsers.ts` | Modify | Write to Spring `Usuario` instead of Prisma `User` |

## Interfaces / Contracts

```typescript
// Next-side Spring session relay (src/lib/springSession.ts)
export async function getSpringSession(cookieHeader: string): Promise<SpringSessionUser | null>
// Calls Spring GET /api/v1/auth/me with forwarded SESSIONID cookie
// Returns null on 401/403

type SpringSessionUser = {
  userId: string
  email: string
  nombreUsuario: string
  rol: { id: string; nombre: string; permisos: string[] }
}
```

```java
// Spring AuthController contract
@PostMapping("/login")
ResponseEntity<LoginResponse> login(@RequestBody LoginRequest req, HttpServletResponse res)

@PostMapping("/logout")
ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res)

@GetMapping("/me")
ResponseEntity<UserDto> me(HttpServletRequest req)
// Returns 401 if session invalid
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Spring credential validation, token hash rotation, session creation | JUnit + Mockito on `SessionService`, `PasswordResetService` |
| Integration | Login→session→me→logout flow; forgot-password→reset-password cycle | Spring MockMvc with embedded test DB |
| E2E | Admin login page redirects through Spring session; admin pages accessible after login | Playwright test against running Spring+Next |
| Regression | Existing admin API endpoints still enforce authorization | Existing `npm run test:e2e:matrix` with `ADMIN_EMAIL`/`ADMIN_PASSWORD` |

## Migration / Rollout

**Phase 1 — Spring Auth Foundation**
- Implement Spring endpoints (login, me, logout, password reset).
- Write and run backfill migration script.
- Deploy Spring with both old (`X-Backend-Api-Key`) and new (session) security active.

**Phase 2 — Next Consumes Spring Session**
- Modify `src/lib/auth.ts` to relay to Spring `/api/v1/auth/me`.
- Modify `src/proxy.ts` to forward `SESSIONID` cookie.
- Modify admin signin page to POST to Spring.
- Disable NextAuth Credentials provider.
- Delete forgot/reset-password Next routes.

**Phase 3 — Decommission**
- Remove Prisma `User`/`PasswordResetToken` auth queries from Next.
- Mark Prisma auth tables as dormant (keep for audit/settings FK).
- Remove backfill endpoint.

**Rollback**: Re-enable NextAuth Credentials provider (single config toggle + redeploy). Prisma `User` table stays populated until Phase 3 completes — no destructive data change.

## Open Questions

- [ ] Does production deploy Next and Spring on the same origin/domain, or will they split? (Affects cookie topology.)
- [ ] Should Spring session store be in-memory (simple) or database-backed (survives restarts)? Tradeoff: in-memory is faster but sessions lost on restart.
- [ ] Is the `Rol.nombre` value `ADMIN` (Spanish) or should it be normalized to an English constant? Current Prisma `Role` enum is `ADMIN`/`USER`.
- [ ] Should `AdminAuditLog` (Prisma) be migrated to a Spring-side audit table, or remain Prisma-owned during this change? Proposal says out-of-scope, but the audit log references `actorUserId` which will change from Prisma `User.id` to Spring `Usuario.id`.

## Design Created

**Change**: unify-admin-auth-and-backend-trust
**Location**: `openspec/changes/unify-admin-auth-and-backend-trust/design.md` (openspec/hybrid) | Engram `sdd/unify-admin-auth-and-backend-trust/design`

### Summary
- **Approach**: Spring-owned admin session with Next as BFF relay; three-phase migration from NextAuth/Prisma to Spring-only auth
- **Key Decisions**: 6 decisions documented (session mechanism, cookie topology, user store authority, Next auth integration, password hash format, authorization model)
- **Files Affected**: 4 new (Spring controllers/services), 7 modified (Next auth/proxy/signin + Spring SecurityConfig/yml), 2 deleted (forgot/reset password routes)
- **Testing Strategy**: Unit (Spring services) + Integration (MockMvc) + E2E (Playwright login flow) + Regression (existing e2e matrix)

### Open Questions
- Production origin topology (same vs split domain)
- Session store persistence strategy
- Rol.nombre constant naming convention
- AdminAuditLog ownership during transition

### Next Step
Ready for tasks (sdd-tasks).
