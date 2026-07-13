# Spring Admin Application Lifecycle Specification

## Purpose

Defines Spring-owned admin detail GET, status PATCH, and hard DELETE for `/api/v1/applications/{id}`, including API key authentication, response shape, and Next adapter auth/audit responsibilities.

## Requirements

### Requirement: Spring Detail Endpoint

The system SHALL expose `GET /api/v1/applications/{id}` in Spring, protected by `X-Backend-Api-Key`. The response MUST include full candidate contact data and optional vacancy metadata (id, title, location). A missing application MUST return `404`.

#### Scenario: Authenticated detail request

- GIVEN a valid `X-Backend-Api-Key` header and an existing application id
- WHEN the client calls `GET /api/v1/applications/{id}`
- THEN Spring returns `200` with `{ id, candidateId, candidateName, email, phone, resumeUrl, resumeFileName, coverLetter, status, submittedAt, vacancy? }`

#### Scenario: Application not found

- GIVEN a valid `X-Backend-Api-Key` header and a non-existent id
- WHEN the client calls `GET /api/v1/applications/{id}`
- THEN Spring returns `404`

#### Scenario: Missing or invalid API key

- GIVEN a request without `X-Backend-Api-Key` or with an invalid token
- WHEN the client calls `GET /api/v1/applications/{id}`
- THEN Spring returns `401` or `403`

### Requirement: Spring Status Update Endpoint

The system SHALL expose `PATCH /api/v1/applications/{id}/status` in Spring, protected by `X-Backend-Api-Key`. The request body MUST contain `{ status }`. The endpoint MUST validate the transition via `ApplicationStatusMachine`, persist the change, and return the updated detail. Illegal transitions MUST return `400`. Same-state updates MUST return `409`. Missing applications MUST return `404`.

#### Scenario: Valid status transition

- GIVEN an application with status `PENDING`
- WHEN the client PATCHes `{ "status": "REVIEWING" }` with a valid API key
- THEN Spring updates the status and returns `200` with the updated detail

#### Scenario: Invalid transition

- GIVEN an application with status `ACCEPTED`
- WHEN the client PATCHes `{ "status": "PENDING" }`
- THEN Spring returns `400` (terminal state)

#### Scenario: Same-state rejection

- GIVEN an application with status `REVIEWING`
- WHEN the client PATCHes `{ "status": "REVIEWING" }`
- THEN Spring returns `409`

### Requirement: Spring Hard Delete Endpoint

The system SHALL expose `DELETE /api/v1/applications/{id}` in Spring, protected by `X-Backend-Api-Key`. A successful delete MUST return `200` with `{ "success": true }`. A missing application MUST return `404`.

#### Scenario: Successful delete

- GIVEN an existing application id
- WHEN the client calls `DELETE /api/v1/applications/{id}` with a valid API key
- THEN Spring removes the record and returns `200` with `{ "success": true }`

#### Scenario: Delete non-existent application

- GIVEN a non-existent id
- WHEN the client calls `DELETE /api/v1/applications/{id}`
- THEN Spring returns `404`

### Requirement: Next Adapter Auth and Audit

The system SHALL make Next `/api/applications/[id]` a thin adapter for GET/PATCH/DELETE. Next MUST validate admin session via NextAuth, enforce `rejectIfUntrustedOrigin()`, call `auditAdminAction()` for DENIED/SUCCESS/ERROR outcomes, then forward to Spring with `X-Backend-Api-Key`. Next MUST NOT read or write Prisma for these paths.

#### Scenario: Admin session valid, Spring succeeds

- GIVEN a valid admin session and Spring returns `200`
- WHEN Next receives `GET /api/applications/[id]`
- THEN Next forwards to Spring, writes audit SUCCESS, and returns the mapped response

#### Scenario: Admin session missing

- GIVEN no valid admin session
- WHEN Next receives `GET /api/applications/[id]`
- THEN Next returns `401` without contacting Spring and writes audit DENIED

### Requirement: Coexistence and Rollback

The system SHALL delegate `{id}` operations to Spring when `BACKEND_URL` is set. When `BACKEND_URL` is absent, the Next adapter MUST return `503 Service Unavailable` — there is no Prisma fallback for this flow; Spring/JPA is the authoritative source. Rollback is achieved by reverting `[id]/route.ts` to a Prisma-backed version (requires code revert, not just env var removal).

#### Scenario: Spring-backed with BACKEND_URL

- GIVEN `BACKEND_URL` is configured
- WHEN an admin calls `GET /api/applications/[id]`
- THEN the request is forwarded to Spring

#### Scenario: BACKEND_URL absent

- GIVEN `BACKEND_URL` is not configured
- WHEN an admin calls `GET /api/applications/[id]`
- THEN the adapter returns `503 Service Unavailable`

## Explicit Non-Goals

- Export migration (CSV generation and data source changes) is out of scope.
- Candidate CRUD migration is out of scope.
- Prisma schema/package removal is out of scope.
- Soft-delete semantics are out of scope.
- Optimistic locking (`@Version`) is deferred to a follow-up.
