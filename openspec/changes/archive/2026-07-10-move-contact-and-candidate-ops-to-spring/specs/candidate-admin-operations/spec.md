# Candidate Admin Operations Specification

## Purpose

Defines Spring-owned manual candidate create (Candidato + spontaneous Postulacion) and identity update with personKey conflict detection. Next remains the thin edge for admin auth, CSRF, and audit.

## Requirements

### Requirement: Spring Manual Candidate Create

The system SHALL expose `POST /api/v1/candidates` in Spring, protected by `X-Backend-Api-Key`. The endpoint MUST create a `Candidato` (or reject on duplicate personKey) and a spontaneous `Postulacion` (vacancyId=null). Returns `201` on success, `409 DUPLICATE_CANDIDATE` on personKey conflict.

#### Scenario: Successful manual create

- GIVEN a valid payload with candidateName, email, phone, and optional notes
- WHEN the admin calls `POST /api/v1/candidates` with a valid API key
- THEN Spring creates a `Candidato` with computed personKey and a spontaneous `Postulacion`, returns `201` with `{ id, personKey, applicationId }`

#### Scenario: Duplicate candidate personKey

- GIVEN an existing `Candidato` with personKey `abc123`
- WHEN the admin creates a new candidate with the same email/phone (same personKey)
- THEN Spring returns `409` with `{ error: "...", code: "DUPLICATE_CANDIDATE" }`

### Requirement: Spring Candidate Identity Update

The system SHALL expose `PATCH /api/v1/candidates/{id}` in Spring, protected by `X-Backend-Api-Key`. The endpoint MUST recalculate personKey from updated identity fields, check for conflicts with other Candidato records, and return `409 CANDIDATE_IDENTITY_CONFLICT` if the new personKey belongs to a different candidate.

#### Scenario: Successful identity update

- GIVEN an existing candidate with id `c1`
- WHEN the admin PATCHes `{ "email": "new@example.com" }` with a valid API key
- THEN Spring recalculates personKey, persists the update, and returns `200`

#### Scenario: Identity conflict with another candidate

- GIVEN candidate `c1` and candidate `c2` with different personKeys
- WHEN the admin updates `c1`'s email to match `c2`'s email
- THEN Spring returns `409` with `{ error: "...", code: "CANDIDATE_IDENTITY_CONFLICT" }`

#### Scenario: Candidate not found

- GIVEN a non-existent candidate id
- WHEN the admin calls `PATCH /api/v1/candidates/{id}`
- THEN Spring returns `404`

### Requirement: Next Candidate Adapter

The system SHALL make Next `/api/admin/candidates` and `/api/admin/candidates/[id]` thin adapters. Next MUST validate admin session via NextAuth, enforce CSRF, call `auditAdminAction()` for DENIED/SUCCESS/ERROR outcomes, then forward to Spring with `X-Backend-Api-Key`. Next MUST NOT perform any Prisma writes for candidate operations.

#### Scenario: Admin create adapter

- GIVEN a valid admin session and well-formed payload
- WHEN Next receives `POST /api/admin/candidates`
- THEN Next forwards to Spring, writes audit SUCCESS, and returns the mapped response

#### Scenario: Admin update without session

- GIVEN no valid admin session
- WHEN Next receives `PATCH /api/admin/candidates/{id}`
- THEN Next returns `401` without contacting Spring and writes audit DENIED

### Requirement: personKey Parity for Candidates

The system SHALL use the same `personKey` computation for candidate operations as defined in `application-intake`. Spring `ApplicationManager.buildPersonKey()` MUST produce identical hashes to Next `buildPersonKey()`. A parity unit test MUST assert this.

#### Scenario: Candidate personKey parity

- GIVEN email `"Maria@Example.com"` and phone `"+54 11 9999-0000"`
- WHEN Spring computes personKey for a candidate create
- THEN the result equals Next `buildPersonKey()` output for the same inputs

### Requirement: Spring-Only-Forward Coexistence

The system SHALL write candidate operations only to Spring/JPA. Prisma `Candidate` tables MUST remain untouched. When `BACKEND_URL` is absent, the Next adapter MUST return `503`. Legacy Prisma candidate rows are invisible to new flows; no backfill is performed.

#### Scenario: BACKEND_URL absent for candidate create

- GIVEN `BACKEND_URL` is not configured
- WHEN an admin calls `POST /api/admin/candidates`
- THEN the adapter returns `503 Service Unavailable`

## Explicit Non-Goals

- Standalone `GET /candidates` list endpoint (list remains derived from `/api/applications`).
- Admin audit JPA migration (audit stays in Next).
- Final Prisma package/schema removal.
- Legacy Prisma candidate row backfill into JPA.
