# Delta for spring-admin-operations

## ADDED Requirements

### Requirement: Spring Admin Operations and Reconciliation

Spring MUST own notifications, audit, settings, and database health; Next MUST preserve the following browser contracts without Prisma fallback.

| Browser endpoint | Required parity |
|---|---|
| Notifications | `GET ?view=all|read|unread&page&limit` returns `{items,pagination:{page,limit,total,totalPages}}`; POST returns its DTO with 201; `DELETE ?view=all|read` returns `{deletedCount}`; `PATCH/DELETE /[id]` return DTO or `{message}`. Invalid input=400, missing id=404. |
| Audit | `GET ?actorEmail&action&resourceType&dateFrom&dateTo&page&limit` returns `{items,pagination,filters:{actions,resourceTypes,actorEmails}}`; inclusive UTC date bounds and descending `createdAt` ordering are preserved. |
| Settings | GET/PATCH return `{profile:{id,email,name,role},preferences:{notificationsEnabled,notifyNewApplications,notifyNewContacts,notifySecurityAlerts},backend:{springVacanciesEnabled},updatedAt}`. |
| Health | `GET /api/health` returns `{status:'ok',database:'ready'}` or 503 `{status:'error',database:'unavailable'}`, always with `Cache-Control: no-store`. |

All protected routes MUST map anonymous to 401, authenticated callers lacking `admin:access` to 403, unavailable/unconfigured Spring to 503, validation to 400, and unexpected failures to 500 while retaining existing JSON error envelopes.

#### Scenario: Notification page parity
- GIVEN an authorized request with `view=unread&page=2&limit=20`
- WHEN Next forwards the notification list request
- THEN it returns the specified items and pagination envelope unchanged

#### Scenario: Health dependency failure
- GIVEN Spring cannot perform its database readiness check
- WHEN `/api/health` is requested
- THEN Next returns the specified 503 body and `Cache-Control: no-store`

### Requirement: Executable Settings Reconciliation and Flyway Adoption

The migration MUST snapshot immutable legacy `AdminSettings`, legacy `User`, and target `Usuario` evidence before any backfill. `normalizedEmail` is Unicode-NFKC, trimmed, lower-cased, non-empty, with no alias/plus-address rewriting. Because the current schemas provide no verified-email flag, equal emails are only candidates: a mapping is VERIFIED only when an immutable approval record binds source/target IDs, normalized email, source row hashes, verifier, timestamp, and report checksum. Each row is `MATCHED`, `UNMATCHED`, `DUPLICATE`, or row-specific `RESET_APPROVED`; only the latter includes product approver, reason, defaults, and the same checksum. Any other result blocks contract.

For an existing non-empty ddl-auto database, a preflight MUST fingerprint the catalog and fail on drift; it then records Flyway baseline version 1 only after the approved fingerprint matches. `V1` MUST create the captured baseline for empty databases; `V2+` MUST use versioned expand/contract migrations, and production Hibernate MUST use `validate`, never `update`. The sequence is: add nullable target FK/evidence tables; snapshot and backfill verified mappings; verify one-to-one count/value parity; add unique/not-null/FK constraints; cut reads/writes; then, after checksum-bound product approval and backup, drop legacy FK/columns and `"User"`.

#### Scenario: Unverifiable email equality
- GIVEN matching legacy and target emails without immutable verification evidence
- WHEN reconciliation runs
- THEN the row is `UNMATCHED` and contract migration is blocked

#### Scenario: Approved reset is bound to evidence
- GIVEN a row has a product-approved reset in the report
- WHEN the report checksum is unchanged during contract validation
- THEN the reset defaults are backfilled and the row is eligible

#### Scenario: Existing database Flyway adoption
- GIVEN a non-empty catalog without Flyway history matches the approved fingerprint
- WHEN baseline version 1 and later migrations run
- THEN V1 is recorded, V2+ apply, and auto-DDL does not alter the schema

### Requirement: Durable Audit Catalog

Spring MUST write `{actorId,email,action,resourceType,resourceId,outcome,ip,userAgent,metadata,createdAt}`. The catalog is `vacancy.{create,update,activate,deactivate,close}`, `contact.{update_status,delete}`, `candidate.{create,update}`, and `application.{view,update_status,delete}`. These replace every `auditAdminAction()` call in the listed vacancy, contact, candidate, and application Next routes. Successful mutation plus SUCCESS audit MUST commit atomically; audit write failure MUST roll back the mutation. DENIED and ERROR events MUST use durable independent persistence; if that write fails, the response remains 401/403 or its error status and an operational alert is emitted (never a swallowed failure).

#### Scenario: Vacancy mutation audit is atomic
- GIVEN an authorized vacancy update
- WHEN its SUCCESS audit insert fails
- THEN the vacancy update rolls back and no success response is returned

#### Scenario: Denied contact request is observable
- GIVEN an anonymous contact delete request
- WHEN durable DENIED audit persistence fails
- THEN the route returns 401 and emits an operational alert
