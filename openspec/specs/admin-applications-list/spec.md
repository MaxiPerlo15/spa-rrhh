# Admin Applications List Specification

## Purpose

Defines the contract for the admin application listing served by Spring and exposed through a thin Next adapter, replacing the current Prisma-backed admin read path.

## Requirements

### Requirement: Admin List Endpoint in Spring

The system SHALL expose `GET /api/v1/applications` in Spring as the authoritative admin read path. The endpoint MUST require the `X-Backend-Api-Key` header and return application records with candidate contact data and optional vacancy metadata.

#### Scenario: Authenticated admin list request

- GIVEN a valid `X-Backend-Api-Key` header
- WHEN the client calls `GET /api/v1/applications`
- THEN Spring returns `200` with an array of `{ id, candidateId, candidateName, email, phone, resumeUrl, resumeFileName, coverLetter, status, submittedAt, vacancy? }`

#### Scenario: Missing or invalid API key

- GIVEN a request without `X-Backend-Api-Key` or with an invalid token
- WHEN the client calls `GET /api/v1/applications`
- THEN Spring returns `401` or `403`

#### Scenario: Filter by vacancyId

- GIVEN query param `?vacancyId={id}`
- WHEN the client calls `GET /api/v1/applications`
- THEN Spring returns only applications for that vacancy

#### Scenario: Filter by status

- GIVEN query param `?status={status}`
- WHEN the client calls `GET /api/v1/applications`
- THEN Spring returns only applications matching that status

### Requirement: Next Adapter for GET

The system SHALL make Next `GET /api/applications` a thin adapter: validate admin session via NextAuth, then forward the request to Spring. Next MUST NOT read Prisma for this path.

#### Scenario: Adapter happy path

- GIVEN a valid admin session
- WHEN Next receives `GET /api/applications`
- THEN Next forwards to Spring with the internal API token and returns the mapped response

#### Scenario: Unauthenticated request

- GIVEN no valid admin session
- WHEN Next receives `GET /api/applications`
- THEN Next returns `401` without contacting Spring

### Requirement: Response Mapping

The system SHALL map Spring's `ApplicationListResponse` to the existing Next `ApplicationAdminDto` shape, preserving candidate contact fields and optional vacancy title/location.

#### Scenario: Vacancy metadata included

- GIVEN a Spring response item with a non-null vacancy object
- WHEN Next maps the response
- THEN the output includes `vacancy.title` and `vacancy.location`

#### Scenario: Spontaneous application (no vacancy)

- GIVEN a Spring response item with null vacancy
- WHEN Next maps the response
- THEN the output includes the application with no vacancy fields

### Requirement: Coexistence with Prisma Data

The system SHALL return only Spring/JPA-sourced applications in the admin list during this slice. Old Prisma applications are not visible until a future data migration. The `{id}` detail/lifecycle paths are now also Spring-backed (see `spring-admin-application-lifecycle`).

#### Scenario: Mixed dataset during rollout

- GIVEN old Prisma applications exist alongside new Spring applications
- WHEN an admin calls `GET /api/applications`
- THEN only Spring-sourced applications appear in the response

#### Scenario: Detail for Spring-sourced application

- GIVEN an application visible in the Spring-backed list
- WHEN an admin calls `GET /api/applications/{id}`
- THEN the detail is served from Spring

## Explicit Non-Goals

- Candidate CRUD/export routes are not migrated.
- Prisma removal or full schema cleanup is out of scope.
- Export CSV generation in Java is out of scope.
