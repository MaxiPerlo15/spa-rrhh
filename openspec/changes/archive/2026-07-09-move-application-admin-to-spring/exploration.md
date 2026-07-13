## Exploration: Move Application Admin to Spring

### Current State
Current admin lifecycle flow summary:
- `GET /api/applications/[id]` in `src/app/api/applications/[id]/route.ts` requires a Next admin session, enforces `rejectIfUntrustedOrigin()`, validates the route id, reads `prisma.application.findUnique(...)` with `candidate`, enriches vacancy metadata through `getApplicationVacancyMetadata()`, and returns `toApplicationAdminDto(...)`.
- `PATCH /api/applications/[id]` requires a Next admin session, audits denied/success/error outcomes, enforces `rejectIfUntrustedOrigin()`, validates `{ status }`, loads the current Prisma row, applies `ApplicationStatusMachine.assertTransition(previous.status, status)`, updates `prisma.application`, enriches vacancy metadata from Spring, and returns `toApplicationAdminDto(...)`.
- `DELETE /api/applications/[id]` requires a Next admin session, audits denied/success/error outcomes, validates the route id, deletes `prisma.application`, and returns `{ success: true }`. Unlike GET/PATCH, it does not call `rejectIfUntrustedOrigin()`.
- `GET /api/applications/export` in `src/app/api/applications/export/route.ts` is still fully Prisma-backed: it builds Prisma `where` and `orderBy`, searches candidate name/lastName/email, and generates CSV via `ExportApplicationsUseCase`. It currently hardcodes `vacancyTitle: 'Espontánea'` for every row.

Current status transition rules and state machine:
- `src/domain/application/ApplicationStatusMachine.ts` is the effective lifecycle owner today.
- Allowed transitions are `PENDING -> REVIEWING|REJECTED`, `REVIEWING -> INTERVIEWED|REJECTED`, and `INTERVIEWED -> ACCEPTED|REJECTED`.
- `ACCEPTED` and `REJECTED` are terminal states, and same-state updates throw an error.

Target Spring-owned admin lifecycle flow:
- Next remains a thin admin adapter: keep Next admin auth, request-shape validation, same-origin policy, and temporary `auditAdminAction(...)`, then delegate detail/status/delete/export data reads to Spring.
- Spring becomes the system of record for `GET/PATCH/DELETE /api/v1/applications/{id}` plus export data/query semantics, including transition validation, persistence, and not-found behavior.

Missing Spring capabilities:
- `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRestController.java` currently exposes only `POST /api/v1/applications` and `GET /api/v1/applications`.
- `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java` supports only intake + list, and list is an in-memory `findAll().stream()` filter with no detail/update/delete/export use cases.
- `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` has incomplete lifecycle guards: `ponerEnRevision()`, `marcarComoEntrevistado()`, and `rechazar()` do not match the Next state machine.
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/PostulacionRepository.java` has only intake duplicate-check queries; there is no eager detail fetch, filtered export query, or status/update helper.
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` protects only `GET /api/v1/applications` with the internal API token, not `/{id}` or export endpoints.

Data coexistence / migration risks:
- The admin list is already Spring-backed in `src/app/api/applications/route.ts`, while detail/PATCH/DELETE/export still depend on Prisma. That is a live split-brain seam.
- Spring `Postulacion.id` is UUID-generated, while Prisma `Application.id` uses `cuid()`, so ids shown in the Spring-backed admin list are not guaranteed to exist in Prisma-backed detail/update/delete/export routes.
- RFC-001 still expects a later table/column migration toward JPA-owned `Application`/`Candidate`, so older Prisma-only rows remain a coexistence problem for this change.

Recommended proposal boundary for this change:
- Include Spring ownership of detail/status/delete/export data, Next adapterization of `src/app/api/applications/[id]/route.ts` and `src/app/api/applications/export/route.ts`, state-machine parity, and explicit coexistence behavior for older Prisma rows.
- Exclude candidate/contact migration, JPA audit-log migration, and final Prisma removal, which the roadmap reserves for later changes.

### Affected Areas
- `src/app/api/applications/[id]/route.ts` — current Prisma-backed admin detail, status update, and delete path
- `src/app/api/applications/export/route.ts` — current Prisma-backed export path and filtering/sorting behavior
- `src/app/api/applications/route.ts` — already Spring-backed list path that now diverges from the remaining admin lifecycle routes
- `src/domain/application/ApplicationStatusMachine.ts` — current canonical transition matrix
- `src/lib/dto/application.ts` — still imports `ApplicationStatus` and `Vacancy` from `@prisma/client`
- `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRestController.java` — missing admin detail/status/delete/export contracts
- `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java` — missing admin lifecycle use cases and server-side query semantics
- `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` — incomplete lifecycle enforcement versus current Next behavior
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/PostulacionRepository.java` — missing detail/export-oriented repository methods
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` — missing internal-token protection for new admin application endpoints
- `prisma/schema.prisma` — Prisma `Application`/`Candidate` remain a coexistence dependency until later migration work

### Approaches
1. **Full Spring admin ownership with Next adapter audit** — Move detail, status transitions, delete, and export data ownership into Spring while keeping auth/origin checks and temporary audit logging in Next.
   - Pros: removes the current split source of truth, aligns with the roadmap target architecture, keeps business rules in one backend owner.
   - Cons: requires new Spring contracts and repository queries, plus an explicit policy for older Prisma-only rows.
   - Effort: Medium

2. **Keep Prisma ownership for detail/update/delete/export longer** — Leave the current Prisma routes in place and defer admin lifecycle migration until a later broader application migration.
   - Pros: smaller short-term Spring diff.
   - Cons: preserves the current split-brain bug, keeps lifecycle rules in Next, and conflicts with the roadmap direction.
   - Effort: Low

### Recommendation
Choose the full Spring admin ownership approach.

Spring should add `GET/PATCH/DELETE /api/v1/applications/{id}` and export-query capability, plus a Java lifecycle/state-machine implementation that exactly matches `src/domain/application/ApplicationStatusMachine.ts`. Next should keep admin auth, same-origin enforcement, request validation, and temporary `auditAdminAction(...)`, but stop reading or mutating Prisma `Application` rows directly. The proposal boundary for this change should stay focused on admin detail/status/delete/export ownership and the coexistence contract for older Prisma rows, leaving audit-table migration and Prisma removal to the later roadmap changes.

### Risks
- Spring and Next can drift again if both keep lifecycle logic; Spring must become the single transition authority.
- Older Prisma-only application rows may 404 or disappear from export/detail after cutover unless the proposal explicitly defines fallback, backfill, or “Spring-only from cutover forward” behavior.
- Export semantics can regress because current Prisma export supports search plus sort by `submittedAt`, `candidateName`, and `status`, while Spring list currently supports only `vacancyId` and `status`.
- The current Next DELETE route lacks `rejectIfUntrustedOrigin()`. If the adapter is rewritten, that gap should be closed rather than preserved.

### Ready for Proposal
Yes — the change is ready for proposal if it stays bounded to moving admin detail/status/delete/export ownership into Spring, defining Spring/Next adapter responsibilities clearly, and making the coexistence behavior for older Prisma rows explicit.
