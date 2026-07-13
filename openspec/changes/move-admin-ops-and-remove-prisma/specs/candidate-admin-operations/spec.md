# Delta for Candidate Admin Operations

## MODIFIED Requirements

### Requirement: Next Candidate Adapter

The system SHALL make Next `/api/admin/candidates` and `/api/admin/candidates/[id]` thin adapters. Next MUST validate Spring `admin:access`, enforce CSRF, forward the session identity to Spring, and preserve browser responses. Spring MUST durably record `candidate.create` and `candidate.update` SUCCESS/DENIED/ERROR events under the catalog; Next MUST NOT call `auditAdminAction()` or Prisma. Missing session, insufficient authority, unavailable Spring, and unexpected failure MUST map to 401, 403, 503, and 500.
(Previously: NextAuth validated sessions and Next wrote best-effort Prisma audit outcomes.)

#### Scenario: Admin create adapter
- GIVEN a valid admin session and well-formed payload
- WHEN Next receives `POST /api/admin/candidates`
- THEN Next forwards to Spring and returns the mapped response

#### Scenario: Admin update without session
- GIVEN no valid admin session
- WHEN Next receives `PATCH /api/admin/candidates/{id}`
- THEN Next returns `401` without a Prisma fallback

#### Scenario: Candidate audit failure
- GIVEN Spring accepts a candidate create but cannot persist SUCCESS audit
- WHEN the mutation transaction completes
- THEN Spring rolls back and Next does not return success
