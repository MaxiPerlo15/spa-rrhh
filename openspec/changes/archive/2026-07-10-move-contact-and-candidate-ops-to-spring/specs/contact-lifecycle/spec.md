# Contact Lifecycle Specification

## Purpose

Defines Spring-owned contact public submit, admin list/detail, status transitions (ContactStatusMachine parity), delete, and 24-hour duplicate detection. Next remains the thin edge for auth, CSRF, audit, rate-limit, and captcha.

## Requirements

### Requirement: Spring Contact Submit

The system SHALL expose `POST /api/v1/contacts` in Spring as the authoritative write path for public contact submissions. The endpoint MUST compute `personKey`, enforce 24-hour duplicate detection on `(personKey, subject)`, and return `201` on success or `409 DUPLICATE_SUBMISSION` on reject.

#### Scenario: Successful public submit

- GIVEN a valid payload with name, email, phone, subject, and message
- WHEN the client POSTs to `/api/v1/contacts`
- THEN Spring creates a `Contacto` with status `PENDING` and returns `201` with `{ id, status, createdAt }`

#### Scenario: Duplicate within 24h

- GIVEN a contact with the same personKey and subject was created 2 hours ago
- WHEN a new submission arrives with identical personKey and subject
- THEN Spring returns `409` with `{ error: "...", code: "DUPLICATE_SUBMISSION" }`

#### Scenario: Re-submission after 24h

- GIVEN a contact with the same personKey and subject was created 25 hours ago
- WHEN a new submission arrives
- THEN Spring creates a new `Contacto` and returns `201`

### Requirement: Contact Dedupe Lock

The system SHALL serialize concurrent contact submissions for the same `(personKey, subject)` using `@Transactional` with `@Lock(PESSIMISTIC_WRITE)` on the dedupe query. Exactly one concurrent request MUST succeed.

#### Scenario: Concurrent submissions same personKey+subject

- GIVEN two requests arrive simultaneously with identical personKey and subject
- WHEN both enter the dedupe transaction
- THEN exactly one succeeds with `201` and the other receives `409`

### Requirement: Spring Admin Contact CRUD

The system SHALL expose admin endpoints in Spring protected by `X-Backend-Api-Key`: `GET /api/v1/contacts` (list), `GET /api/v1/contacts/{id}` (detail), `PATCH /api/v1/contacts/{id}` (status update), `DELETE /api/v1/contacts/{id}` (delete). Missing resources MUST return `404`.

#### Scenario: Admin list contacts

- GIVEN a valid `X-Backend-Api-Key` header
- WHEN the client calls `GET /api/v1/contacts`
- THEN Spring returns `200` with an array of contact summaries

#### Scenario: Admin detail contact

- GIVEN a valid API key and an existing contact id
- WHEN the client calls `GET /api/v1/contacts/{id}`
- THEN Spring returns `200` with full contact data including `subject`, `personKey`, `updatedAt`

### Requirement: Contact Status Transitions

The system SHALL validate contact status changes via a `ContactStatusMachine`: `PENDING → RESPONDED|ARCHIVED`, `RESPONDED → ARCHIVED`. Illegal transitions MUST return `400 INVALID_CONTACT_TRANSITION`.

#### Scenario: Valid transition PENDING to RESPONDED

- GIVEN a contact with status `PENDING`
- WHEN the client PATCHes `{ "status": "RESPONDED" }` with a valid API key
- THEN Spring updates the status and returns `200`

#### Scenario: Invalid transition ARCHIVED to PENDING

- GIVEN a contact with status `ARCHIVED`
- WHEN the client PATCHes `{ "status": "PENDING" }`
- THEN Spring returns `400` with `{ error: "...", code: "INVALID_CONTACT_TRANSITION" }`

### Requirement: Next Contact Adapter

The system SHALL make Next `/api/contacts` and `/api/contacts/[id]` thin adapters. Next MUST enforce `guardPublicRequest()` (rate limit + Turnstile) for POST, admin session + CSRF + audit for admin operations, then forward to Spring. Next MUST NOT perform any Prisma writes for contacts.

#### Scenario: Public submit adapter

- GIVEN a well-formed request passing rate limit and captcha
- WHEN Next receives `POST /api/contacts`
- THEN Next forwards to Spring and returns Spring's response verbatim

#### Scenario: Admin action without session

- GIVEN no valid admin session
- WHEN Next receives `PATCH /api/contacts/{id}`
- THEN Next returns `401` without contacting Spring and writes audit DENIED

### Requirement: personKey Parity

The system SHALL compute contact `personKey` identically in Spring and Next: `SHA-256(normalizedEmail + "|" + normalizedPhone)`. A parity test MUST assert identical output for the same inputs.

#### Scenario: Contact personKey parity

- GIVEN email `"Ana@Example.com"` and phone `"+54 11 5678-1234"`
- WHEN Spring computes personKey for a contact submission
- THEN the result equals Next `buildPersonKey()` output for the same inputs

### Requirement: Spring-Only-Forward Coexistence

The system SHALL write contacts only to Spring/JPA. Prisma `Contact` tables MUST remain untouched. When `BACKEND_URL` is absent, the Next adapter MUST return `503`. Legacy Prisma contact rows are invisible to new flows; no backfill is performed.

#### Scenario: BACKEND_URL absent

- GIVEN `BACKEND_URL` is not configured
- WHEN a request hits `POST /api/contacts`
- THEN the adapter returns `503 Service Unavailable`

## Explicit Non-Goals

- Admin audit JPA migration (audit stays in Next).
- Final Prisma package/schema removal.
- Legacy Prisma contact row backfill into JPA.
