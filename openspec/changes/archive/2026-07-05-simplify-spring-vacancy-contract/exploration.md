## Exploration: simplify-spring-vacancy-contract

### Current State
Spring now fully owns vacancy persistence and lifecycle, but Next still owns a duplicated translation layer for the Spring vacancy contract. The same `SpringVacancyResponse` shape is declared in `src/app/api/vacancies/route.ts`, `src/app/api/vacancies/[id]/route.ts`, `src/lib/server/publicVacancies.ts`, `src/lib/server/applicationVacancyMetadata.ts`, and `src/app/api/applications/route.ts`, with slightly different subsets per file. The same Spring→Next vacancy mapping (`titulo` → `title`, `estadoActual` → normalized lowercase status, missing `salary`/`benefits` → `undefined`) is also duplicated across the vacancy list route, vacancy detail route, and public vacancies loader.

`normalizeSpringVacancyStatus` is still needed today because Spring returns `CREATED|ACTIVE|INACTIVE|CLOSED`, while the Next vacancy DTO/UI expects lowercase values and maps `CREATED` to `draft`. That mismatch is visible in `src/lib/server/springBackend.ts`, in the vacancy routes, and again inline in `src/app/api/applications/route.ts`, which re-implements the same normalization logic instead of reusing the helper.

`getUnsupportedSpringVacancyFields` is duplicated in both vacancy route files and is still functionally required today. Spring’s create/update commands only accept `titulo`, `descripcion`, `requisitos`, `ubicacionNombre`, `ubicacionDescripcion`, `jornada`, and `modalidad` (`backend/.../CreateVacancyCommand.java`, `UpdateVacancyCommand.java`), while the Next request schemas and admin UI still expose `salary` and `benefits`.

The highest avoidable complexity is not just duplicated types: `src/app/api/vacancies/[id]/route.ts` still does a read-before-write round trip for updates/status changes, converts lowercase DTO status back to uppercase just to satisfy `VacancyStatusMachine`, and duplicates Spring error parsing that already exists in the collection route. That means Next is still partly mediating Spring business rules instead of mostly relaying them.

### Affected Areas
- `src/app/api/vacancies/route.ts` — declares a Spring response type, rejects unsupported fields, builds Spring create payloads, and maps Spring responses back to the frontend DTO.
- `src/app/api/vacancies/[id]/route.ts` — repeats the same response type, field rejection, error parsing, and DTO mapping; also adds extra prefetch/status-transition logic before calling Spring.
- `src/lib/server/publicVacancies.ts` — repeats the Spring response type and Spring→frontend DTO mapping for public vacancy cache loading.
- `src/lib/server/applicationVacancyMetadata.ts` — defines its own reduced Spring vacancy shape and parser for application enrichment.
- `src/app/api/applications/route.ts` — defines another Spring vacancy shape and re-implements status normalization inline for application submission validation.
- `src/lib/server/springBackend.ts` — currently holds only backend URL/header helpers plus `normalizeSpringVacancyStatus`, but it is the natural place for a shared Spring vacancy contract helper or gateway.
- `src/lib/apiValidation.ts` — still accepts `salary` and `benefits` for vacancy create/update requests, which forces Next-side rejection logic.
- `src/lib/api/vacancies.ts` — normalizes vacancy status to lowercase again on the client, so status normalization currently happens on both the server DTO boundary and the frontend API client.
- `backend/src/main/java/com/meinardi/rrhh/presentation/VacancyResponse.java` — authoritative Spring response contract that Next is translating repeatedly.
- `backend/src/main/java/com/meinardi/rrhh/application/CreateVacancyCommand.java` — confirms Spring create does not support salary/benefits today.
- `backend/src/main/java/com/meinardi/rrhh/application/UpdateVacancyCommand.java` — confirms Spring update does not support salary/benefits today.

### Approaches
1. **Centralize the Spring vacancy contract in Next** — move Spring vacancy types, status mapping, payload builders, and error parsing into one shared contract/gateway module, then make all routes consume it.
   - Pros: Removes the current duplication with low architectural risk; keeps external Next API shape stable; fits the 400-line review budget better; also lets applications reuse the same status/parser logic.
   - Cons: Keeps a translation layer in Next; does not remove `normalizeSpringVacancyStatus`; does not remove salary/benefits rejection while Spring lacks those fields.
   - Effort: Medium

2. **Align the Next vacancy API more aggressively to Spring** — centralize the contract and also stop re-mediating Spring rules: remove read-before-write status validation, let Spring own transition errors, and optionally narrow the Next request/response shape toward what Spring actually supports.
   - Pros: Bigger simplification payoff; removes extra fetches and string/status conversions; moves rule ownership more cleanly to Spring.
   - Cons: Higher ripple effect because it can touch admin UI/forms, validation schemas, and client expectations for lowercase statuses or unsupported fields.
   - Effort: High

### Recommendation
Start with **Approach 1**, but include one targeted piece from Approach 2: remove the redundant read-before-write/status-prevalidation path in `src/app/api/vacancies/[id]/route.ts` and trust Spring’s own transition/business-rule responses. Concretely, this change should centralize the Spring vacancy response type(s), Spring→frontend mapping, Spring create/update payload builders, unsupported-field detection, and Spring error-body parsing into one shared Next module, then reuse that module from vacancy routes, public vacancies, and application vacancy validation/enrichment. Keep `normalizeSpringVacancyStatus` for now, because Spring still returns `CREATED` while Next consumers still expect `draft/active/inactive/closed`.

### Risks
- Removing `normalizeSpringVacancyStatus` outright would be wrong today unless the frontend contract changes too; the UI and dashboard logic still expect lowercase statuses and treat `draft` as distinct from Spring’s `CREATED`.
- Removing `getUnsupportedSpringVacancyFields` is not safe yet because Spring still does not accept `salary` or `benefits`, and the admin UI plus request schemas still send those fields.
- If the change also narrows the public Next API contract, it will ripple into `src/app/admin/page.tsx`, `src/lib/api/vacancies.ts`, and public vacancy card consumers.
- Route-test fixtures currently encode the duplicated contract in several places, so consolidation will require test rewrites, not just import swaps.

### Ready for Proposal
Yes — the scope is concrete. The proposal should frame this as **contract deduplication plus removal of redundant Next-side mediation**, not as a full frontend contract redesign. It should explicitly keep status normalization and unsupported-field rejection unless Spring or the frontend contract changes in the same slice.
