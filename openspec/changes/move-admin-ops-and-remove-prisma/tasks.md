# Tasks: Move Admin Operations and Remove Prisma

## Review Workload Forecast

| Unit | Changed lines | Risk | Rollback |
|---|---:|---|---|
| PR1a session bridge | 350–390 | High | Revert Spring bridge only |
| PR1b Next BFF states | 120–180 | Medium | Revert typed BFF states only |
| PR1c Flyway/evidence | 300–390 | High | Revert Flyway/evidence only |
| PR2 / PR3 / PR4 / PR5 | 360–400 / 330–390 / 320–380 / 900–1,300 | High | Existing slice boundary |
| **Total** | **2,680–3,430** | **High** | **Chained work units** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Delivery strategy: ask-on-risk. A projected or actual 400-line diff requires re-slicing, never a size exception.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1a | Spring session bridge | PR1a | Base: feature/tracker; tasks 1.1–1.2 only; commit `feat(auth): bridge Spring sessions`. |
| 1b | Typed Next BFF states | PR1b | Base: PR1a; depends on its `/auth/me` contract; commit `feat(proxy): gate admin with Spring session states`. |
| 1c | Flyway and reconciliation evidence | PR1c | Base: PR1b; independent rollback; split if >350 projected lines. |
| 2–5 | Existing slices | PR2–PR5 | Immediate-parent base; tests/docs stay in commit. |

`feature/tracker → 📍 PR1a → PR1b → PR1c → PR2 → PR3 → PR4 → PR5`. Retarget/rebase any child showing prior work.

## Slice 1a: Backend Session Bridge — Expand

- [ ] 1.1 **RED** In `backend/src/test/java/com/meinardi/rrhh/{infrastructure/SecurityConfigTest.java,infrastructure/SecurityConfigApplicationRoutesTest.java,application/SessionServiceTest.java,presentation/AuthControllerTest.java}`, specify revalidation, stale cleanup, JSON 401/403, and holder cleanup; run focused Maven tests.
- [ ] 1.2 **GREEN→REFACTOR** Add `SessionAuthenticationFilter`; update `SecurityConfig.java`, `SessionService.java`, `AuthController.java`, `UsuarioRepository.java`, and `application.yml`; commit bridge/tests together and split above 400 lines.

## Slice 1b: Typed Next BFF Session States — Expand

- [ ] 1.3 **RED→GREEN→REFACTOR** After PR1a, cover `authorized|anonymous|forbidden|unavailable` in `src/lib/__tests__/{springSession.test.ts,proxyBranches.test.ts,proxySpringSession.test.ts}`; update only `src/lib/springSession.ts` and `src/proxy.ts` for anonymous redirects and 403/503; run focused Vitest and commit with code.

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
