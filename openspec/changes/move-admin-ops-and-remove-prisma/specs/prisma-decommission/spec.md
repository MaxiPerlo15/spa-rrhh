# Delta for prisma-decommission

## ADDED Requirements

### Requirement: Gated Prisma Decommission

Prisma removal MUST wait for an approved reconciliation checksum, retention recovery/parity tests, and production-like admin, policy, export, and health smoke checks. Schema and migrations MUST first be copied immutably to `docs/archive/prisma/**`. The repository-root command MUST be:

```sh
npm run verify:orm-removal
```

That script MUST obtain NUL-delimited paths from `git ls-files`; exclude ONLY `docs/archive/**` and `openspec/**`; and fail on any other tracked pathname containing case-insensitive `prisma`, including `prisma.config.ts`, `src/lib/prisma.ts`, `src/lib/prismaError.ts`, directories, and equivalent renamed paths. It MUST also fail when any included tracked file contains case-insensitive `prisma`, even when casing differs.

The gate MUST deny `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, and `@types/pg` in every direct dependency section and in package-lock root declarations, package records, or legacy dependency records. Git failure, malformed manifests/lockfiles, or unreadable tracked files MUST fail closed. CI MUST run the exact command in a required job included in the `CI Success` dependency and success predicate; failure MUST block decommission merge and legacy deletion. Migrated routes MUST NOT regain Prisma fallbacks. Historical references MAY remain only under `docs/archive/**` and `openspec/**`.

#### Scenario: Gates pass
- GIVEN every migration, parity, smoke, archive, and executable scan gate passes
- WHEN decommission is approved
- THEN archives are retained and Prisma artifacts may be removed

#### Scenario: Gate fails
- GIVEN reconciliation, smoke, content, pathname, dependency, lockfile, or gate execution fails
- WHEN decommission is evaluated
- THEN CI fails and decommission merge and legacy deletion are blocked

#### Scenario: Case-insensitive content is denied
- GIVEN an included tracked document contains uppercase or mixed-case `Prisma`
- WHEN the gate executes
- THEN it reports that file and exits non-zero

#### Scenario: Path-only residue is denied
- GIVEN an included tracked `src/lib/prismaError.ts` has no forbidden token in its content
- WHEN the pathname scan executes
- THEN it reports that path and exits non-zero

#### Scenario: Package and lockfile residue is denied
- GIVEN `@types/pg` remains in a direct dependency section or package-lock record
- WHEN the dependency gate executes
- THEN it reports the package and exits non-zero

#### Scenario: Allowed archival reference
- GIVEN the immutable archive contains `prisma/schema.prisma`
- WHEN the tracked-repository gate executes
- THEN that path is excluded while all other tracked paths and contents are checked
