# Candidate Export Specification

## Purpose

Defines the Spring-backed candidate CSV export that replaces the Prisma-based export. The data source switches to Spring-owned applications so vacancy metadata (title, location) is correctly included in the export.

## Requirements

### Requirement: Spring-Backed Export Data Source

The system SHALL source candidate export data from Spring's `/api/v1/applications` list endpoint instead of Prisma. The export MUST include correct vacancy title and location for each application. CSV generation remains in Next.

#### Scenario: Export includes vacancy metadata

- GIVEN applications exist in Spring with associated vacancy data
- WHEN the admin triggers candidate export
- THEN the CSV includes correct vacancy title and location per application row

#### Scenario: Export with spontaneous applications

- GIVEN spontaneous applications (vacancyId=null) exist in Spring
- WHEN the admin triggers candidate export
- THEN those rows appear with vacancy fields empty or marked as spontaneous

### Requirement: Next Export Adapter

The system SHALL make Next `GET /api/admin/candidates/export` a thin adapter. Next MUST validate admin session, call Spring `/api/v1/applications` (with internal API key), pass the response through `buildCandidateSummaries()` and `ExportCandidatesUseCase`, then return the CSV. Next MUST NOT query Prisma for export data.

#### Scenario: Successful export

- GIVEN a valid admin session and Spring returns application data
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns a CSV with correct headers and vacancy metadata

#### Scenario: Export without admin session

- GIVEN no valid admin session
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns `401` without contacting Spring

#### Scenario: Spring unavailable during export

- GIVEN `BACKEND_URL` is not configured or Spring is unreachable
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN Next returns `503 Service Unavailable`

### Requirement: Export Vacancy Metadata Correctness

The system SHALL ensure the candidate export CSV includes the vacancy title and location from the Spring application's associated vacancy. This fixes the current Prisma-based export bug where vacancy context is lost and all rows show "Espontánea".

#### Scenario: Vacancy title present in CSV

- GIVEN an application linked to vacancy "Desarrollador Senior" in location "Buenos Aires"
- WHEN the export CSV is generated
- THEN the row contains "Desarrollador Senior" as vacancy title and "Buenos Aires" as location

### Requirement: Spring-Only-Forward Coexistence

The system SHALL read export data only from Spring/JPA. When `BACKEND_URL` is absent, the export adapter MUST return `503`. Legacy Prisma application rows are invisible to the new export; no backfill is performed.

#### Scenario: BACKEND_URL absent for export

- GIVEN `BACKEND_URL` is not configured
- WHEN the admin calls `GET /api/admin/candidates/export`
- THEN the adapter returns `503 Service Unavailable`

## Explicit Non-Goals

- Dedicated Spring candidate-summary endpoint (reuses existing `/api/v1/applications`).
- Admin audit JPA migration (audit stays in Next).
- Final Prisma package/schema removal.
- Legacy Prisma row backfill into JPA.
