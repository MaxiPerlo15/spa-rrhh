```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:008d1c7d433b9e662405fe856fd46a3cae46735a422dfcfda17b40002b7ba569
verdict: fail
blockers: 6
critical_findings: 6
requirements: 3/12
scenarios: 8/39
test_command: SPRING_AUTH_E2E_SPEC=tests/e2e/auth-spring-session.spec.ts npm run test:e2e:spring-auth
test_exit_code: 0
test_output_hash: sha256:008d1c7d433b9e662405fe856fd46a3cae46735a422dfcfda17b40002b7ba569
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:dfc8b782c92a98047ad145fe42ba84c11841d94e6298fccf053908c27221a6cb
```

## Verification Report

**Change:** `move-admin-ops-and-remove-prisma`  
**Mode:** Strict TDD; native-authorized fresh full verification.  
**Native authorization:** active attempt 2 at `sha256:8fe9d33e4dc9c719d8374b73e2a3184c64bf67e5c2ca6a58dcc3d0aedc2e802f`; no acquire operation was run.

### Completeness

| Metric | Result |
|---|---:|
| Current task entries | 12 / 12 checked |
| Delta requirements | 12 |
| Delta scenarios | 39 |
| Requirements proven by fresh passing scenarios | 3 / 12 |
| Scenarios proven by fresh runtime evidence | 8 / 39 |

`tasks.md` is complete only for a dashboard-read/logout slice. It is not a complete mapping for the parent proposal; `apply-progress.md` explicitly excludes candidate work, retention, exports, and Prisma decommission.

### Build, Tests, and Coverage

| Command | Result | Exit | SHA-256 |
|---|---|---:|---|
| `DATABASE_URL=.../verification_never_touch npm run test:unit` | 84 files, 571 tests passed | 0 | `9e83c9fb97e5c040c414d1271d4e1987d4608255e35bb11e7d8daf8ebde436b9` |
| `DATABASE_URL=.../verification_never_touch npm run test:coverage` | 84 files, 571 tests passed; thresholds passed | 0 | `25bc1de7c42e8d3081b8760c0b3a01d3f5780a928a3be96874ea50b5cde52e0a` |
| `npm run typecheck` | passed | 0 | `6bb9260f66ab483818e7ccdb083d2de03ea5b636a786d671030d191e681fd490` |
| `npm run lint` | passed | 0 | `edb097f62799cb9deda1c757a9663f9c76fc286bc0c94ac20543783067c7f835` |
| `DATABASE_URL=.../verification_never_touch npm run build` | passed; unavailable public-vacancy fetch logged | 0 | `dfc8b782c92a98047ad145fe42ba84c11841d94e6298fccf053908c27221a6cb` |
| `cd backend && SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:9/verification_never_touch mvn test` | 302 tests passed; Testcontainers/H2 only | 0 | `30fe0f18194cc170a2f32b2351fc618be5571b68a720700d2035ed9930dbb904` |
| `SPRING_AUTH_E2E_SPEC=tests/e2e/auth-spring-session.spec.ts npm run test:e2e:spring-auth` | 11 Chromium cases passed | 0 | `008d1c7d433b9e662405fe856fd46a3cae46735a422dfcfda17b40002b7ba569` |
| `npm run verify:orm-removal` | missing script | 1 | `06b07a860cffac6e8bdcf000d3ee7ae5682c3356761352e1ce6b1c96b2dda41f` |
| `git diff --check && git diff --cached --check` | passed | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Coverage: statements **88.14%**, branches **79.72%**, functions **96.07%**, lines **88.92%**; all configured thresholds pass.

### Disposable Database Evidence

The Spring-auth runner used a unique Docker PostgreSQL 16 container, database `rrhh_e2e`, and a random loopback port; it applied Flyway V1-V6 and removed the container in `finally`. The final container check found no E2E container. `spa_rrhh_db` was not used.

### Spec Compliance Matrix

| Requirement | Scenarios | Result |
|---|---:|---|
| Spring Role Enforcement | 3 | ✅ COMPLIANT |
| Next Role Gating from Session | 2 | ✅ COMPLIANT |
| SecurityContext Session Bridge | 3 | ✅ COMPLIANT |
| Next Candidate Adapter | 3 | ⚠️ PARTIAL: legacy/no-session tests, not Spring-session proof |
| Next Export Adapter | 4 | ❌ UNTESTED: legacy NextAuth mocks, missing required cases |
| Applications Export Parity | 2 | ❌ FAILING: route imports and queries Prisma |
| Gated Prisma Decommission | 6 | ❌ FAILING: gate absent; Prisma runtime/residue remains |
| Next Adapter Auth and Audit | 3 | ⚠️ PARTIAL: no complete current parent scenario evidence |
| Spring Admin Operations and Reconciliation | 2 | ⚠️ PARTIAL: fresh E2E logged settings GET 404s |
| Executable Settings Reconciliation and Flyway Adoption | 3 | ⚠️ PARTIAL: no complete parent approval/contract evidence |
| Durable Audit Catalog | 2 | ⚠️ PARTIAL: no complete route/alert scenario evidence |
| Spring Retention and Public Policy | 6 | ❌ FAILING: Next-owned; CV retention imports Prisma |

**Compliance summary:** 8 / 39 scenarios compliant; the other 31 are failing, partial, or untested.

### Correctness

| Area | Status | Evidence |
|---|---|---|
| Dashboard Spring authorization/cookie relay | ✅ | 11-case Chromium suite passed protected reads, notification relay, `/admin`, and logout expiry. |
| Candidate adapters and exports | ❌ | Candidate source/tests retain legacy auth; applications export uses Prisma. |
| Settings parity | ⚠️ | Fresh browser output has four `/api/admin/settings` 404s, not passing parity proof. |
| Retention/public policy and Prisma removal | ❌ | `cvRetention.ts` and `publicRequestGuard.ts` remain Next-owned; required gate is absent. |

### Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Request-time `admin:access` authorization | ✅ | Spring filter and `getSpringSession()` use permission authorities. |
| Append-only rotated-cookie relay | ✅ | Fresh Chromium proof passes the active slice. |
| Expand/contract and no Prisma fallback | ❌ | Parent exports, retention, and decommission violate the design. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| Evidence reported | ✅ | `apply-progress.md` has TDD tables. |
| GREEN confirmed | ✅ | 571 Vitest, 302 Maven, 11 Chromium cases pass. |
| RED/provenance reproducible | ⚠️ | Historical RED cannot be reproduced from a green worktree. |
| Parent triangulation | ❌ | 31 declared scenarios lack complete fresh coverage. |

### Test Layer Distribution

| Layer | Tests | Files |
|---|---:|---:|
| Unit | 47 | 5 changed files |
| Integration | 0 | 0 changed files |
| E2E | 11 | 1 changed file |

### Changed File Coverage and Quality

`src/lib/server/adminBffBoundary.ts`: 100.00% lines / 94.59% branches. The configured V8 report does not emit the changed App Router route modules, so their per-file coverage is not measurable. Lint and typecheck pass.

### Assertion Quality

No tautologies or empty assertion loops were found in changed tests. E2E presence assertions are paired with status, value, or follow-up authorization checks.

### Issues Found

**CRITICAL**

1. Parent task/spec scope is inconsistent: checked slice tasks do not cover the 12-requirement/39-scenario proposal.
2. Candidate adapters and exports do not meet required Spring-session behavior; applications export still uses Prisma.
3. Prisma decommission is not implemented: the mandatory script is absent and runtime/dependency residue remains.
4. Retention and public policy remain Next-owned; CV retention directly uses Prisma.
5. Settings parity has no passing live proof because fresh E2E logged 404 responses.
6. Thirty-one parent scenarios lack passing fresh covering tests.

**WARNING**

1. Build passed while logging an unavailable public-vacancy fetch.
2. V8 does not report coverage for changed App Router route modules.

**SUGGESTION**

1. Restore parent-complete tasks or split the completed dashboard/session slice before another final verification.

### Verdict

**FAIL** — all requested executable suites passed except the missing ORM-removal gate, but the complete parent migration is substantively incomplete and is not eligible for passing settlement.
