# Delta for Spring Admin Application Lifecycle

## MODIFIED Requirements

### Requirement: Next Adapter Auth and Audit

The system SHALL make Next `/api/applications/[id]` a thin adapter for GET/PATCH/DELETE. Next MUST validate Spring `admin:access`, enforce `rejectIfUntrustedOrigin()`, forward session identity to Spring, and preserve browser responses. Spring MUST durably record `application.view`, `application.update_status`, and `application.delete` SUCCESS/DENIED/ERROR events; success mutation and audit commit atomically. Next MUST NOT call `auditAdminAction()` or Prisma. Missing session, insufficient authority, unavailable Spring, and unexpected failure MUST map to 401, 403, 503, and 500.
(Previously: NextAuth validated sessions and Next wrote best-effort Prisma audit outcomes.)

#### Scenario: Admin session valid, Spring succeeds
- GIVEN a valid admin session and Spring returns `200`
- WHEN Next receives `GET /api/applications/[id]`
- THEN Next forwards to Spring and returns the mapped response

#### Scenario: Admin session missing
- GIVEN no valid admin session
- WHEN Next receives `GET /api/applications/[id]`
- THEN Next returns `401` without contacting a Prisma fallback

#### Scenario: Application audit write fails
- GIVEN a status update succeeds logically but its SUCCESS audit write fails
- WHEN Spring completes the transaction
- THEN Spring rolls back the status update and Next returns a failure response
