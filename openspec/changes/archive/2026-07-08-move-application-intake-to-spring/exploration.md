## Exploration: Move Application Intake to Spring

### Current State
`POST /api/applications` in `/Users/maxiperlo/Coding/spa-rrhh/src/app/api/applications/route.ts` is still Next-owned. The route validates payloads with `createApplicationSchema`, runs `guardPublicRequest()` for rate limiting + Turnstile, fetches `/api/v1/vacancies/{id}` from Spring for vacancy existence/status, normalizes Spring `estadoActual`, then opens a Prisma transaction. Inside that transaction, Next computes `personKey` via `buildPersonKey(email, phone)`, acquires `pg_advisory_xact_lock(hashtext('application:${personKey}:${vacancyId|spontaneous}'))`, upserts `Candidate` by `personKey`, checks for an `Application` in the last 24 hours for the same `candidateId + vacancyId`, and creates a new Prisma `Application` with status `PENDING` when no duplicate exists. Admin `GET /api/applications` is also Next-owned: it reads Prisma applications/candidates directly and enriches vacancy title/location from Spring through `getApplicationVacancyMetadata()`.

### Affected Areas
- `/Users/maxiperlo/Coding/spa-rrhh/src/app/api/applications/route.ts` — current public intake flow, duplicate lock, candidate upsert, admin list
- `/Users/maxiperlo/Coding/spa-rrhh/src/app/api/applications/[id]/route.ts` — application lifecycle still Prisma-backed and should stay out of this intake slice
- `/Users/maxiperlo/Coding/spa-rrhh/src/lib/personIdentity.ts` — current SHA-256 `personKey` identity rule based on normalized email + phone
- `/Users/maxiperlo/Coding/spa-rrhh/src/lib/publicRequestGuard.ts` — current rate limit + captcha enforcement that may remain in Next or be duplicated in Spring
- `/Users/maxiperlo/Coding/spa-rrhh/src/lib/server/applicationVacancyMetadata.ts` — current Spring metadata enrichment used by admin list/detail responses
- `/Users/maxiperlo/Coding/spa-rrhh/prisma/schema.prisma` — live `Candidate`/`Application` data model with `Candidate.personKey @unique` and no FK from `Application.vacancyId`
- `/Users/maxiperlo/Coding/spa-rrhh/backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` — Spring already has domain rules for vacancy-backed applications (`Vacante.canReceiveApplications()`, default `PENDING`)
- `/Users/maxiperlo/Coding/spa-rrhh/backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java` — Spring candidate entity is missing Prisma-era identity/resume fields and still models `cv` as a required single string
- `/Users/maxiperlo/Coding/spa-rrhh/backend/src/main/java/com/meinardi/rrhh/application` — no application intake service/use case exists yet
- `/Users/maxiperlo/Coding/spa-rrhh/backend/src/main/java/com/meinardi/rrhh/presentation` — no application controller/DTOs exist yet
- `/Users/maxiperlo/Coding/spa-rrhh/backend/src/main/java/com/meinardi/rrhh/infrastructure` — no `Postulacion`/`Candidato` repositories exist yet

### Approaches
1. **Spring-owned intake with thin Next adapters** — Add Spring `POST /api/v1/applications` for public submission and `GET /api/v1/applications` for admin listing, then make Next `/api/applications` validate/authenticate and forward requests/responses instead of owning persistence.
   - Pros: Removes the highest split-brain seam; moves vacancy validation, candidate identity, dedupe, and write-side business rules into the backend owner; aligns with roadmap and target architecture.
   - Cons: Requires Spring to catch up on schema fields, repositories, DTO mapping, auth for admin list, and concurrency-safe duplicate protection; public-request protections need an explicit ownership decision.
   - Effort: High

2. **Keep hybrid intake and only proxy vacancy checks** — Leave Prisma candidate/application writes in Next and only keep trimming Spring-validation code around it.
   - Pros: Smaller immediate diff.
   - Cons: Preserves split source of truth, duplicate logic in the frontend runtime, and the Prisma/JPA drift risk around candidates/applications; directly conflicts with the roadmap.
   - Effort: Medium

### Recommendation
Use **Spring-owned intake with thin Next adapters**.

Target flow for this change:
1. Next `POST /api/applications` keeps request-shape validation and public ingress policy, then forwards the validated payload to Spring.
2. Spring `POST /api/v1/applications` becomes the owner of vacancy validation, candidate identity/upsert, duplicate detection, advisory-lock-or-equivalent serialization, and `Application` creation.
3. Next returns Spring's success/error payloads without Prisma writes.
4. Next `GET /api/applications` remains as an authenticated adapter only: enforce Next admin session, call Spring `GET /api/v1/applications`, and return the mapped DTO.

Missing Spring capabilities before that can work:
- `ApplicationRestController` exposing at least `POST /api/v1/applications` and `GET /api/v1/applications`
- request/response DTOs for public intake and admin list
- application use case/service layer analogous to `VacancyManager`
- `PostulacionRepository` and `CandidatoRepository`
- candidate identity model matching Prisma behavior (`personKey`, optional resume metadata, update-on-repeat identity)
- duplicate detection rule matching Next semantics: same person + same vacancy/null spontaneous within 24h returns 409 `DUPLICATE_SUBMISSION`
- DB-level concurrency strategy equivalent to the current advisory lock; without it, concurrent submits can bypass duplicate checks
- admin-list query/mapping that returns candidate contact data plus optional vacancy title/location
- security rules for `/api/v1/applications`: public POST allowed, admin/internal GET protected

Recommended proposal boundary for `move-application-intake-to-spring`:
- IN: Spring public intake endpoint, Spring admin list endpoint, Next `/api/applications` POST+GET adapters, shared contract tests, and removal of Prisma writes from `src/app/api/applications/route.ts`
- OUT: `/api/applications/[id]` admin lifecycle, admin candidate CRUD/export routes, Prisma cleanup/removal, backfill/migration of old rows, and moving captcha/rate-limit enforcement into Spring unless explicitly chosen as part of ingress ownership

### Risks
- **Candidate schema drift**: Prisma `Candidate` has `personKey`, `resumeUrl`, `resumeFileName`, `resumeKey`, `createdAt`, `updatedAt`; current Spring `Candidato` does not. Intake migration without schema alignment will either lose data or force contract degradation.
- **Application schema drift**: Prisma `Application` stores `vacancyId` as a nullable scalar with no FK, while Spring `Postulacion` currently uses a `@ManyToOne Vacante` mapped to `vacante_id`. Spontaneous applications and old vacancy references need an explicit Spring persistence strategy.
- **Duplicate semantics regression**: the current 24-hour duplicate window is protected by PostgreSQL advisory locks inside the transaction. A naive Spring `find then insert` will race.
- **Existing data coexistence**: old Prisma `Candidate`/`Application` rows remain the live admin dataset today. If Spring starts writing to different tables/columns before RFC-001 alignment is implemented, admin list results will fragment.
- **Contract mismatch for admin list**: current Next DTO includes candidate contact fields and optional Spring vacancy metadata enrichment. Spring must either return that fully-shaped payload or Next will need temporary mapping glue.
- **Ingress ownership ambiguity**: if rate limiting/captcha stay only in Next, direct callers to Spring could bypass protections unless Spring stays non-public behind the BFF; if protections move to Spring now, this change grows.

### Ready for Proposal
Yes — the scope is clear if the proposal is kept to intake + admin list adapterization only. The orchestrator should tell the user: "Exploration is complete. This change should move public application submission and admin application listing into Spring ownership, while leaving application lifecycle/admin candidate operations for later slices. The main technical blockers are Spring schema parity for `Candidate`/`Application` and a concurrency-safe duplicate check equivalent to the current advisory lock."

### Gotchas Discovered During Implementation

1. **Mockito mock overwrite**: When using `when(mock.method()).thenReturn(value1)` followed by `when(mock.method()).thenReturn(value2)`, the second `when()` **overwrites** the first. For sequential behavior simulation (e.g., concurrency tests), use `thenAnswer` with an `AtomicInteger` counter instead.

2. **PESSIMISTIC_WRITE vs advisory lock**: Spring's `@Lock(LockModeType.PESSIMISTIC_WRITE)` on `CandidatoRepository.findByPersonKey()` uses `SELECT FOR UPDATE`, which serializes concurrent transactions at the database level. This is functionally equivalent to PostgreSQL's `pg_advisory_xact_lock` but operates at the row level rather than an application-level lock. The lock is released when the first transaction commits, allowing the second thread to proceed and detect the duplicate.

3. **H2 supports SELECT FOR UPDATE**: H2 in-memory database (used in tests) supports `SELECT FOR UPDATE` in its default MVCC mode. This means integration tests with real pessimistic locking can work without needing a PostgreSQL test instance.

4. **Coexistence during rollout**: Spring writes to JPA tables (`candidato`, `postulacion`); Prisma tables (`Candidate`, `Application`) remain untouched. Admin listing returns only Spring-sourced applications. Old Prisma applications are invisible until a future migration backfills them.

5. **Route.ts Prisma import removal**: The `ApplicationStatus` enum import in `src/app/api/applications/route.ts` was changed from `@prisma/client` to `@/domain/application/ApplicationStatusMachine` to eliminate runtime Prisma coupling. This is a prerequisite for the adapter pattern to work correctly.

6. **personKey parity is critical**: The SHA-256 computation in `ApplicationManager.buildPersonKey()` must exactly match `buildPersonKey()` in `src/lib/personIdentity.ts`. Any normalization difference (email casing, phone digit stripping, leading `+` preservation) will produce different keys and break candidate identity across systems. Tests verify exact hash equality with known inputs.

7. **Spontaneous application duplicate check**: When `vacancyId` is null (spontaneous), the duplicate check uses `findRecentSpontaneousByCandidato()` instead of `findRecentByCandidatoAndVacante()`. Both paths must be covered by concurrency tests.

8. **Controller exception mapping**: `ApplicationExceptionHandler` maps `IllegalStateException` (duplicate) → 409 with `DUPLICATE_SUBMISSION` code, and `IllegalArgumentException` (invalid vacancy) → 400. The Next adapter must forward these error shapes verbatim without transformation.