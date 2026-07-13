# Delta for Admin Applications List

## MODIFIED Requirements

### Requirement: Coexistence with Prisma Data

The system SHALL return only Spring/JPA-sourced applications in the admin list during this slice. Old Prisma applications are not visible until a future data migration. The `{id}` detail/lifecycle paths are now also Spring-backed (see `spring-admin-application-lifecycle`).

(Previously: Non-goal stated `/api/applications/[id]` detail/lifecycle remains Prisma-backed. That is no longer true — detail/lifecycle is now Spring-owned.)

#### Scenario: Mixed dataset during rollout

- GIVEN old Prisma applications exist alongside new Spring applications
- WHEN an admin calls `GET /api/applications`
- THEN only Spring-sourced applications appear in the response

#### Scenario: Detail for Spring-sourced application

- GIVEN an application visible in the Spring-backed list
- WHEN an admin calls `GET /api/applications/{id}`
- THEN the detail is served from Spring

## Explicit Non-Goals (Updated)

- Candidate CRUD/export routes are not migrated.
- Prisma removal or full schema cleanup is out of scope.
- Export CSV generation in Java is out of scope.
