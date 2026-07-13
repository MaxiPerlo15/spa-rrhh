# Application Intake Specification

## Purpose

Defines the contract for public application submission delegated from Next to Spring, including vacancy validation, candidate identity, duplicate rejection, and concurrency-safe creation.

## Requirements

### Requirement: Public Submission Endpoint

The system SHALL expose `POST /api/v1/applications` in Spring as the authoritative write path for public applications. The endpoint MUST accept a validated payload, perform all business rules, and return `201` on success, `409` on duplicate, or `400` on invalid vacancy.

#### Scenario: Successful public submission

- GIVEN a valid payload with candidate name, email, phone, and optional vacancyId
- WHEN the client POSTs to `/api/v1/applications`
- THEN Spring creates a new application with status `PENDING` and returns `201` with `{ id, submittedAt, status }`

#### Scenario: Invalid vacancy

- GIVEN a payload referencing a vacancyId that does not exist or has `estadoActual` that blocks applications
- WHEN the client POSTs to `/api/v1/applications`
- THEN Spring returns `400` with error message and does not create any record

#### Scenario: Spontaneous application (no vacancy)

- GIVEN a valid payload with `vacancyId: null`
- WHEN the client POSTs to `/api/v1/applications`
- THEN Spring creates the application without vacancy association and returns `201`

### Requirement: Next Adapter for POST

The system SHALL make Next `POST /api/applications` a thin adapter: validate request shape with Zod, enforce `guardPublicRequest()` (rate limit + Turnstile), then forward the validated payload to Spring. Next MUST NOT perform any Prisma writes.

#### Scenario: Adapter happy path

- GIVEN a well-formed public request passing rate limit and captcha
- WHEN Next receives `POST /api/applications`
- THEN Next forwards to Spring and returns Spring's status code and body verbatim

#### Scenario: Adapter rejects malformed input

- GIVEN a request failing Zod validation
- WHEN Next receives `POST /api/applications`
- THEN Next returns `400` without contacting Spring

### Requirement: Candidate Identity (personKey)

The system SHALL compute `personKey` as `SHA-256(normalizedEmail + "|" + normalizedPhone)` where email is trimmed/lowercased and phone preserves leading `+` with non-digit characters stripped. Spring MUST produce identical keys to the existing Next implementation.

#### Scenario: personKey parity

- GIVEN email `"Juan@Example.com"` and phone `"+54 11 1234-5678"`
- WHEN Spring computes personKey
- THEN the result equals the Next `buildPersonKey()` output for the same inputs

#### Scenario: Candidate upsert on repeat identity

- GIVEN an existing Candidato with a known personKey
- WHEN a new application arrives with the same email/phone
- THEN Spring updates the existing Candidato record and links the new application

### Requirement: Duplicate Detection (24h Window)

The system SHALL reject an application if the same candidate already has an application for the same vacancy (or spontaneous) within the last 24 hours. The response MUST be `409` with code `DUPLICATE_SUBMISSION`.

#### Scenario: Duplicate within 24h

- GIVEN candidate X applied to vacancy V 2 hours ago
- WHEN candidate X submits again for vacancy V
- THEN Spring returns `409` with `{ error: "...", code: "DUPLICATE_SUBMISSION" }`

#### Scenario: Re-application after 24h

- GIVEN candidate X applied to vacancy V 25 hours ago
- WHEN candidate X submits again for vacancy V
- THEN Spring creates a new application and returns `201`

### Requirement: Concurrency-Safe Intake

The system SHALL serialize concurrent submissions for the same personKey using pessimistic locking (`SELECT FOR UPDATE` on Candidato within a transaction) to prevent duplicate inserts under concurrency.

#### Scenario: Concurrent submissions for same candidate

- GIVEN two requests arrive simultaneously for the same email/phone and vacancy
- WHEN both enter the intake transaction
- THEN exactly one succeeds with `201` and the other receives `409`

### Requirement: Coexistence and Rollback

The system SHALL write applications only to Spring/JPA tables during this slice. Prisma `Candidate`/`Application` tables MUST remain untouched. Rollback MUST be achievable by reverting Next `route.ts` to the Prisma-backed flow without data migration.

#### Scenario: Rollback to Prisma path

- GIVEN the Spring intake is deployed and receiving traffic
- WHEN the team reverts `src/app/api/applications/route.ts`
- THEN public submission and admin listing return to the Prisma path with no data loss

## Explicit Non-Goals

- `/api/applications/[id]` lifecycle operations remain Prisma-backed.
- Candidate CRUD/export routes are not migrated.
- Prisma removal or schema cleanup is out of scope.
