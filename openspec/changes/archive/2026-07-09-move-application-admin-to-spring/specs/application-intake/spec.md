# Delta for Application Intake

## MODIFIED Requirements

### Requirement: Coexistence and Rollback

The system SHALL write applications only to Spring/JPA tables during this slice. Prisma `Candidate`/`Application` tables MUST remain untouched. Rollback is achieved by reverting Next `route.ts` to the Prisma-backed flow (requires code revert). The `{id}` detail/lifecycle paths are now also Spring-backed (see `spring-admin-application-lifecycle`); there is no Prisma fallback for these paths — Spring/JPA is authoritative.

(Previously: Non-goal stated `/api/applications/[id]` lifecycle operations remain Prisma-backed. That is no longer true — detail/lifecycle is now Spring-owned.)

#### Scenario: Rollback to Prisma path

- GIVEN the Spring intake is deployed and receiving traffic
- WHEN the team reverts `src/app/api/applications/route.ts`
- THEN public submission and admin listing return to the Prisma path with no data loss

## Explicit Non-Goals (Updated)

- Candidate CRUD/export routes are not migrated.
- Prisma removal or schema cleanup is out of scope.
