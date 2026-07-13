## Archive Report: unify-admin-auth-and-backend-trust

**Archived**: 2026-07-04
**Change**: unify-admin-auth-and-backend-trust
**Archive path**: `openspec/changes/archive/2026-07-04-unify-admin-auth-and-backend-trust/`

### Summary

This change established Spring as the single owner of admin authentication, session management, password lifecycle, and role-based authorization. Next.js was demoted from identity authority to a thin BFF relay. The migration was executed across 4 chained PRs:

| PR | Phase | Description | Lines |
|----|-------|-------------|-------|
| PR 1 | Spring Auth Foundation | AuthController, SessionService, UsuarioRepository, SecurityConfig session auth, tests | ~380 |
| PR 2 | Password Reset + Backfill | PasswordResetService, forgot/reset endpoints, BackfillMigrationController, tests | ~200 |
| PR 3 | Next Consumes Spring Session | springSession.ts relay, proxy.ts forwarding, signin UI, NextAuth disable, E2E test | ~200 |
| PR 4 | Decommission Prisma Auth | Removed old routes, decommissioned auth.ts, adminUsers Spring-only, schema dormant | ~70 |

### Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| admin-session | Created (full spec) | 8 requirements: login, /me, logout, BFF relay, login UI, NextAuth disable, Prisma dormancy, rollback |
| admin-password-reset | Created (full spec) | 5 requirements: forgot-password, reset-password, token expiry, route removal |
| admin-authorization | Created (full spec) | 7 requirements: role enforcement, role claim structure, Next gating, backward compatibility, user migration, migration phasing |

### Archive Contents

- proposal.md ✅ — Intent, scope, approach, risks, rollback plan
- exploration.md ✅ — Current state analysis, approaches, recommendation
- design.md ✅ — Technical approach, 6 architecture decisions, endpoints, data flow, migration strategy
- specs/ ✅ — 3 delta specs (admin-session, admin-password-reset, admin-authorization)
- tasks.md ✅ — 36 tasks across 4 phases, all complete
- apply-progress.md ✅ — PR 1 TDD evidence, file changes, deviations
- verify-report.md ✅ — Full verification with spec compliance matrix; CRITICAL issue (stale test reference) resolved before archive
- archive-report.md ✅ (this file)

### Verification Status

- **Backend tests**: 62/62 pass (BUILD SUCCESS)
- **Frontend tests**: 247/248 pass (1 pre-existing failure unrelated to this change)
- **Typecheck**: Clean
- **Lint**: Clean
- **Final verdict**: ✅ PASS (CRITICAL issue resolved — stale `BackfillMigrationService` reference in `SecurityConfigTest.java` removed)

### Source of Truth Updated

The following main specs now reflect the new behavior:
- `openspec/specs/admin-session/spec.md`
- `openspec/specs/admin-password-reset/spec.md`
- `openspec/specs/admin-authorization/spec.md`

### Key Accomplishments

1. **Spring-owned admin session**: Created `AuthController` (login/logout/me), `SessionService`, `UsuarioRepository`, security configuration with session-based ADMIN role enforcement
2. **Password reset lifecycle**: Spring owns token generation, email dispatch, validation, and hash rotation via `PasswordResetService`
3. **User migration**: Backfill endpoint migrated Prisma `User` records to Spring `Usuario`/`Rol` with bcrypt-compatible hash passthrough
4. **Next BFF relay**: Created `springSession.ts` relay, updated `proxy.ts` for session forwarding, modified signin UI to POST to Spring
5. **NextAuth decommissioned**: Credentials provider disabled, Prisma auth queries removed, old password reset routes deleted
6. **Prisma schema marked dormant**: `User` and `PasswordResetToken` tables documented as dormant with rollback safety comments
7. **Rollback procedure**: Documented 5-step rollback in `auth.ts`, Prisma tables retained for data safety

### Remaining Follow-up Items

1. **`SPRING_AUTH_ENABLED` feature flag**: Still active in `proxy.ts`, `springSession.ts`, `adminUsers.ts`, and `checkEnv.ts`. Once Spring auth is verified in production for 2+ weeks, simplify to Spring-only and remove conditional paths.
2. **Production origin topology**: Confirm whether Next and Spring share the same domain in production. If they split domains, cookie topology changes needed (cross-origin relay).
3. **Session store persistence**: Currently in-memory (sessions lost on restart). A database-backed session store should be considered for production.
4. **AdminAuditLog ownership**: The audit log references `actorUserId` from Prisma `User.id`, which has now changed to Spring `Usuario.id`. This is out of scope for this change but needs addressing.
5. **Phase 4 TDD evidence**: The apply-progress only documents Phase 1 TDD cycle evidence. For future changes, ensure all phases document their TDD evidence.
