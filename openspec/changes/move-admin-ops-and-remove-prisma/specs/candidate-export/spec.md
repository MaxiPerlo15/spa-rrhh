# Delta for Candidate Export

## MODIFIED Requirements

### Requirement: Next Export Adapter

The system SHALL make Next `GET /api/admin/candidates/export` a thin adapter. It MUST validate `admin:access` through the Spring session, forward `search` unchanged, source application data from Spring, pass it through `buildCandidateSummaries()` and `ExportCandidatesUseCase`, and return the existing CSV bytes with its exact `Content-Type` and `Content-Disposition: attachment; filename=...` headers. Next MUST NOT query Prisma.
(Previously: The adapter used its prior admin-session mechanism.)

#### Scenario: Successful export
- GIVEN a valid admin session and Spring returns application data
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns CSV with its existing headers and vacancy metadata

#### Scenario: Export without admin session
- GIVEN no valid admin session
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns `401` without contacting Spring

#### Scenario: Export with insufficient permission
- GIVEN an authenticated session without `admin:access`
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns 403 without contacting Spring

#### Scenario: Spring unavailable during export
- GIVEN Spring is unavailable
- WHEN the admin requests export
- THEN Next returns `503` without a Prisma fallback

## ADDED Requirements

### Requirement: Applications Export Parity

`GET /api/applications/export` MUST preserve `status`, `vacancyId`, `search` (trimmed, maximum 120), `sortBy` (`submittedAt|candidateName|status`), and `sortDirection` (`asc|desc`, default `desc`). It MUST return the existing CSV bytes and `Content-Type`/`Content-Disposition` headers on 200; invalid parameters MUST return the existing `{error:'Parámetros inválidos',details:[{field,message}]}` 400 envelope. Anonymous, insufficient-authority, unavailable Spring, and unexpected failures MUST return 401, 403, 503, and the existing 500 JSON envelope respectively; no Prisma fallback is permitted.

#### Scenario: Filtered applications CSV
- GIVEN an authorized request with `status=REVIEWING&sortBy=candidateName`
- WHEN Next forwards the export source query to Spring
- THEN it returns the same filtered CSV contract and download headers

#### Scenario: Invalid applications export query
- GIVEN `sortBy=unknown`
- WHEN the export endpoint is requested
- THEN it returns the specified 400 validation envelope without contacting Spring
