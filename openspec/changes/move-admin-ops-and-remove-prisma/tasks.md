# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Unit | Changed lines | Risk | Rollback |
|---|---:|---|---|
| PR1a session bridge | 398 actual | High | Revert Spring bridge only |
| PR1a-fix cookie parity | 45–70 | Medium | Revert cookie-policy/logout-response child |
| PR1b Next BFF states | 120–180 | Medium | Revert typed BFF states only |
| PR1c Flyway/evidence | 300–390 | High | Revert Flyway/evidence only |
| PR2 / PR3 / PR4 / PR5 | 360–400 / 330–390 / 320–380 / 900–1,300 | High | Existing slice boundary |
| **Total** | **2,773–3,508** | **High** | **Chained work units** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Delivery strategy: ask-on-risk. A projected or actual 400-line diff requires re-slicing, never a size exception.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1a | Spring session bridge core | PR1a | Base: feature/tracker; task 1.2a complete; 398 lines. |
| 1a-fix | Cookie/logout parity | PR1a-fix | Base: PR1a; RED/GREEN tests and cookie-response fix only. |
| 1b | Typed Next BFF states | PR1b | Base: PR1a-fix; depends on the repaired `/auth/me` contract. |
| 1c | Flyway and reconciliation evidence | PR1c | Base: PR1b; independent rollback; split if >350 projected lines. |
| 2–5 | Existing slices | PR2–PR5 | Immediate-parent base; tests/docs stay in commit. |

`feature/tracker → PR1a → 📍 PR1a-fix → PR1b → PR1c → PR2 → PR3 → PR4 → PR5`. PR1b must target PR1a-fix; retarget/rebase any child showing prior work.

## Slice 1a: Backend Session Bridge — Expand

- [ ] 1.1 **RED** In `backend/src/test/java/com/meinardi/rrhh/{infrastructure/SecurityConfigTest.java,infrastructure/SecurityConfigApplicationRoutesTest.java,application/SessionServiceTest.java,presentation/AuthControllerTest.java}`, specify revalidation, stale cleanup, JSON 401/403, and holder cleanup; run focused Maven tests.
- [x] 1.2a **GREEN→REFACTOR** Core session bridge: `SessionAuthenticationFilter`, Spring security authorization, stale invalidation, and focused bridge tests; PR1a is 398 changed lines.
- [ ] 1.2b **PR1a-fix cookie/logout parity — RED→GREEN** In `SessionServiceTest`, assert `Secure=true` and `Secure=false` deletion headers; in `AuthControllerTest`/MockMvc, assert 204 logout emits clearing `Set-Cookie` and response propagation. Then consume `server.servlet.session.cookie.secure`, centralize expiry-cookie creation (`Path=/`, `Max-Age=0`, `HttpOnly`, `SameSite=Lax`, conditional `Secure`), and pass `HttpServletResponse` through logout validation/invalidation; run focused 34-test baseline plus new tests, full Maven, package, and diff check.

PR1a-fix excludes Next BFF, Flyway/reconciliation, admin adapters, retention/policy, and Prisma. Task 1.2 is incomplete until PR1a-fix passes.

## Slice 1b: Typed Next BFF Session States — Expand

- [x] 1.3 **RED→GREEN→REFACTOR** After PR1a-fix, cover `authorized|anonymous|forbidden|unavailable` in `src/lib/__tests__/{springSession.test.ts,proxyBranches.test.ts,proxySpringSession.test.ts}`; update only `src/lib/springSession.ts` and `src/proxy.ts` for anonymous redirects and 403/503; run focused Vitest and commit with code.

## Slice 1c: Flyway Adoption and Reconciliation Evidence — Expand

- [ ] 1.4 **RED** Add `backend/src/test/java/com/meinardi/rrhh/application/{FlywayAdoptionIntegrationTest.java,AdminSettingsReconciliationServiceTest.java}` for drift, unverifiable equality, approved reset, and checksum parity.
- [ ] 1.5 **GREEN→REFACTOR** Add `backend/src/main/resources/db/migration/V1__*.sql`/`V2__*.sql`, immutable evidence services/models, and `application.yml` Flyway/`ddl-auto:validate`; run focused Maven. Split adoption from evidence if forecast approaches 400; commit verified rollback units separately.

## Slice 2: Admin Ownership — Expand

- [ ] 2.1 **RED** Add MockMvc/Vitest contracts for notification, audit, settings, health, 401/403/503, and no-store.
- [ ] 2.2 **GREEN** Add Spring admin services/controller and forward `src/app/api/admin/{notifications,notifications/[id],audit,settings}/route.ts` plus `src/app/api/health/route.ts`.
- [ ] 2.3 **REFACTOR** Remove local drift branches only after parity; commit/revert this adapter/catalog unit.

## Slice 3: Operations — Expand

- [ ] 3.1 **RED** Cover audit purge classification, CV dry-run/lease/retry/supersede, and public-policy denial.
- [ ] 3.2 **GREEN→REFACTOR** Add retention/policy services and forward internal retention and UploadThing routes; remove local retention helpers only after parity.

## Slice 4: Contract Evidence — Contract

- [ ] 4.1 **RED→GREEN** Cover 29 audit outcomes, CSRF/origin, export contracts, and no fallback; migrate audit call sites and adapters.
- [ ] 4.2 Record approved reconciliation checksum and run admin/policy/export/health smoke fixtures; retain legacy data on failure.

## Slice 5: Prisma Decommission — Contract

- [ ] 5.1 **RED→GREEN** Test and add the archive, fail-closed `verify-orm-removal` command, and required CI job.
- [ ] 5.2 After approval, remove Prisma dependencies/runtime only when all gates pass; run install, verifier, unit, and Maven tests, or restore archive/revert.
