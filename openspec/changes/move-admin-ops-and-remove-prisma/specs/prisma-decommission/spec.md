# Delta for prisma-decommission

## ADDED Requirements

### Requirement: Gated Prisma Decommission

Prisma removal MUST wait for an approved reconciliation checksum, retention recovery/parity tests, and production-like admin, policy, export, and health smoke checks. Schema and migrations MUST first be copied immutably to `docs/archive/prisma/**`. The repository-root command MUST be:

```sh
npm run verify:orm-removal
```

That script MUST obtain NUL-delimited paths from `git ls-files`; exclude ONLY `docs/archive/**` and `openspec/**`; and fail on any other tracked pathname containing case-insensitive `prisma`, including `prisma.config.ts`, `src/lib/prisma.ts`, `src/lib/prismaError.ts`, directories, and equivalent renamed paths. It MUST also fail when any included tracked file contains case-insensitive `prisma`, even when casing differs, except for the immutable Flyway content allowlist below.

The content allowlist MUST contain exactly these repository-relative paths and SHA-256 byte digests:

| Path | SHA-256 |
|---|---|
| `backend/src/main/resources/db/migration/V2__add_reconciliation_evidence.sql` | `a8c2d28fe8f202c461ab290b7b13cd4f94aac1d4ba5bb4c0590ffff7be06798f` |
| `backend/src/main/resources/db/migration/V3__add_reconciliation_approval_bindings.sql` | `cf9f5fb65d14462745cab8ad535d21584e7a25120d1e061104ff5e31423255bf` |
| `backend/src/main/resources/db/migration/V5__backfill_verified_admin_settings_contract.sql` | `df6ac016e73b83678591c39d695b9fbd8149e8d865ee1f9d12add757557b7a75` |

The verifier MUST calculate each listed file's SHA-256 from its tracked bytes before allowing its historical `prisma` content and MUST fail closed on an absent, unreadable, altered, duplicate, or unlisted manifest entry. It MUST validate the resolved Flyway migrations before accepting this exception and fail if Flyway reports a checksum or migration-validation error. This is a content-only exception: every other included tracked pathname and file byte remains subject to the strict case-insensitive scan; no directory, filename pattern, or other source/test exception is permitted.

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
- THEN that path is excluded while every non-exempt tracked path and content is checked

#### Scenario: Manifest-pinned immutable Flyway content is allowed
- GIVEN each listed V2, V3, and V5 path has its exact manifest SHA-256 and Flyway validation succeeds
- WHEN the tracked-repository gate encounters historical `prisma` content in one of those files
- THEN it permits only that file's content while continuing every other scan

#### Scenario: Altered immutable Flyway migration is denied
- GIVEN a listed V2, V3, or V5 file differs by one byte from its manifest digest
- WHEN the tracked-repository gate executes
- THEN it reports the digest mismatch and exits non-zero without accepting the exception

#### Scenario: Unlisted tracked historical content is denied
- GIVEN any included tracked source or test outside the three exact paths contains `prisma`
- WHEN the tracked-repository gate executes
- THEN it reports that file and exits non-zero

#### Scenario: Flyway validation fails
- GIVEN a listed migration's Flyway checksum or validation result is invalid
- WHEN the tracked-repository gate executes
- THEN it exits non-zero even if every manifest digest matches
