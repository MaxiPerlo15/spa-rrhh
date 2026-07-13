## Exploration: Move Contact and Candidate Ops to Spring

### Current State
- **Current contact + candidate flow summary**
  - `src/app/api/contacts/route.ts` is fully Prisma-backed today. Public `POST /api/contacts` validates with Zod, runs `guardPublicRequest()` for rate limit + captcha, computes `personKey` with `buildPersonKey()`, acquires a PostgreSQL advisory lock on `contact:${personKey}:${subject}`, rejects duplicates inside a 24h window, creates a Prisma `Contact` in `PENDING`, and fires `sendNewContactEmail()` asynchronously.
  - `src/app/api/contacts/[id]/route.ts` is also Prisma-backed for admin detail, status update, and delete. `PATCH` uses `ContactStatusMachine` (`PENDING -> RESPONDED|ARCHIVED`, `RESPONDED -> ARCHIVED`), while Next keeps auth, CSRF, and audit logging.
  - Candidate admin operations are split. The candidate **list** is not a standalone backend resource: `src/app/api/applications/route.ts` already reads Spring-owned applications, then `src/lib/candidates.ts` groups those application rows client-side into candidate summaries for the dashboard.
  - `src/app/api/admin/candidates/route.ts` and `[id]/route.ts` still mutate Prisma directly. `POST` creates a Prisma `Candidate` plus a spontaneous Prisma `Application`; `PATCH` recalculates `personKey`, checks identity conflicts, updates the Prisma candidate, then returns all related applications for UI merge.
  - `src/app/api/admin/candidates/export/route.ts` is still Prisma-backed. It reads Prisma applications, groups them with `buildCandidateSummaries()`, and generates CSV in Next. It currently loses vacancy context and effectively exports `Espontánea` as the latest vacancy title because the route never selects vacancy metadata.
- **Missing Spring capabilities**
  - `backend/src/main/java/com/meinardi/rrhh/domain/model/Contacto.java` is not Prisma-parity ready: it still uses Spanish field names and lacks `subject`, `personKey`, and `updatedAt`, so Spring cannot represent the current Next contact contract yet.
  - There is no Spring `ContactoRepository`, contact service/input boundary, request/response DTOs, or contact controller for public submit + admin CRUD/lifecycle.
  - There is no Spring replacement yet for the current advisory-lock-based 24h contact dedupe rule.
  - Spring already has reusable candidate/application pieces (`Candidato`, `CandidatoRepository`, `ApplicationManager`, spontaneous `Postulacion` support), but it has no candidate-specific admin controller/service for manual create/update or candidate-oriented export/query responses.
  - Next adapter DTOs are still Prisma-coupled: `src/lib/dto/contact.ts` imports `Contact` from `@prisma/client`, and `src/lib/dto/application.ts` imports Prisma `ApplicationStatus`/`Vacancy` types.
- **Data coexistence / migration risks**
  - Per RFC-001, Prisma `Contact`/`Candidate`/`Application` tables and JPA `contacto`/`candidato`/`postulacion` tables are different stores. Moving contacts/candidates to Spring without migration will make legacy Prisma rows invisible to new Spring-owned flows.
  - Prisma ids are `cuid()` while JPA ids are UUIDs. `routeIdSchema` accepts both, but old Prisma-backed candidate/contact ids can still 404 once the adapter only talks to Spring.
  - `personKey` uniqueness/backfill is already present for JPA `Candidato`, but not for `Contacto`; legacy data migration can surface collisions when old Prisma rows are copied into JPA.

### Affected Areas
- `src/app/api/contacts/route.ts` — current public submit + admin list route with Prisma persistence, advisory-lock dedupe, and contact email side effect
- `src/app/api/contacts/[id]/route.ts` — current Prisma-backed admin detail/status/delete route with lifecycle and audit behavior
- `src/app/api/admin/candidates/route.ts` — current Prisma manual candidate create path that also creates a spontaneous application
- `src/app/api/admin/candidates/[id]/route.ts` — current Prisma identity update path with `personKey` conflict checks and related application fan-out
- `src/app/api/admin/candidates/export/route.ts` — current Prisma export path with grouping logic and missing vacancy metadata
- `src/lib/candidates.ts` — current client-side candidate summary builder derived from application rows
- `src/lib/personIdentity.ts` — current canonical Next `personKey` hashing logic that Spring must keep in parity with
- `src/lib/dto/contact.ts` — Prisma-coupled contact DTO mapper that should become backend-agnostic
- `src/lib/dto/application.ts` — Prisma-coupled application DTO mapper reused by candidate operations
- `backend/src/main/java/com/meinardi/rrhh/domain/model/Contacto.java` — existing JPA contact entity missing Prisma-parity fields required for migration
- `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java` — existing Spring candidate/personKey/spontaneous-application logic that can be reused for admin candidate operations
- `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` — internal-token protection must be extended for new contact/candidate Spring endpoints

### Approaches
1. **Combined change with internal slices** — Keep one change name, but implement it as a contact slice first and a candidate slice second.
   - Pros: matches the roadmap, keeps reviewable PRs under the budget, reuses already-migrated Spring application/candidate logic, and removes Prisma writes from both domains without introducing more roadmap drift.
   - Cons: contact schema + dedupe parity is still non-trivial, and candidate export needs an explicit ownership decision.
   - Effort: Medium

2. **Split contacts and candidates into separate changes** — Treat them as two independent migrations.
   - Pros: smaller conceptual scope and easier rollback per domain.
   - Cons: prolongs mixed ownership, duplicates adapter/security/DTO cleanup work, and breaks the roadmap boundary for Day 9.
   - Effort: Medium/High

### Recommendation
Choose the **combined change with internal slices**.

**Target Spring-owned flow recommendation**:
- Contacts should move fully to Spring for public submit plus admin list/detail/status/delete. Spring should own `personKey`, 24h duplicate detection, lifecycle validation, and persistence. Next should remain only as the thin edge for public rate-limit/captcha, admin auth, CSRF, audit logging, and response mapping.
- Candidates should stay application-backed for reads in this change: keep the admin candidate list derived from the already Spring-backed `/api/applications` feed, but move manual candidate create/update to Spring so JPA `Candidato` + spontaneous `Postulacion` become the write-side authority.
- Candidate export should stop reading Prisma. Prefer a Spring candidate-summary query if you want the cleanest ownership line; if you want the smaller slice, keep CSV generation in Next and feed it only Spring-owned application/candidate data.

**Recommended proposal boundary for this combined change**:
- Include contact schema parity (`Contacto` fields), contact repository/service/controller, candidate manual create/update Spring endpoints, candidate export source cutover, new Next Spring gateways/adapters, and Prisma-type decoupling in DTOs.
- Exclude admin audit JPA migration, a full UI refactor to a standalone `GET /candidates` page model, and final Prisma package removal.

### Risks
- Contact duplicate protection can regress if Spring does not replace the current advisory-lock behavior with an equivalent transactional locking strategy.
- Legacy Prisma contacts/candidates/applications may disappear from admin flows after cutover unless the proposal explicitly defines “Spring-only from cutover forward” versus a backfill/migration step.
- `personKey` backfill into JPA contacts/candidates can surface uniqueness conflicts from old normalized email/phone data.
- Candidate export/search semantics can drift again if grouping/filtering remains duplicated between Spring and Next.
- Prisma type imports in Next DTOs can keep hidden ORM coupling alive even after route delegation is migrated.

### Ready for Proposal
Yes — ready if the proposal explicitly commits to no Prisma fallback, defines the coexistence policy for legacy Prisma rows, and scopes delivery as one combined change with a contact slice first and a candidate slice second.
