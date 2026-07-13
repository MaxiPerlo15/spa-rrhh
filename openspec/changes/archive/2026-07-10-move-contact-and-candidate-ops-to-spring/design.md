# Design: Move Contact and Candidate Operations to Spring

## Technical Approach

Eliminate Prisma writes for contacts and candidates by making Spring/JPA the authoritative store. Next remains a thin edge for auth, CSRF, audit, rate-limit, and captcha. The change is delivered as two internal slices: contacts first, then candidates.

Contacts move fully: public submit, admin list/detail/status/delete. Candidates move write-side (manual create/update) and read-side (export source cutover). No Prisma fallback — Spring-only forward.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Contact dedupe lock | A) PostgreSQL advisory lock via raw SQL; B) `@Transactional` + `@Lock(PESSIMISTIC_WRITE)` on `findByPersonKeyAndSubject` | A keeps Prisma dependency; B is pure JPA and portable | B — transactional pessimistic write |
| Contact status validation | A) Keep `ContactStatusMachine` in Next; B) Replicate in Spring service; C) Use JPA `@PreUpdate` | A leaks domain logic to edge; C is implicit; B is explicit and testable | B — Spring service validates transitions |
| Candidate manual create reuse | A) Reuse `ApplicationManager.submitApplication` with `vacancyId=null`; B) Dedicated `CandidateAdminService` | A conflates public intake with admin rules (reject duplicate vs find-or-create); B is cleaner separation | B — dedicated admin service |
| Candidate export source | A) Spring candidate-summary endpoint; B) Reuse existing Spring `/api/v1/applications` list in Next | A adds new endpoint; B uses existing Spring API and fixes vacancy metadata bug with zero new Spring code | B — proxy applications list to Next export route |
| DTO status type | A) Keep `Contact['status']` / `ApplicationStatus` from `@prisma/client`; B) String literal union | A hides ORM coupling; B decouples completely | B — string literal union `ContactStatus` / `ApplicationStatus` |
| personKey parity | A) Trust existing Spring `ApplicationManager.buildPersonKey()`; B) Add parity test | A risks silent drift; B is cheap insurance | B — parity unit test Next ↔ Spring SHA-256 |

## Data Flow

```
Public Contact Submit          Admin Contact Ops
       │                             │
   [Next] guardPublicRequest    [Next] auth + CSRF + audit
       │                             │
       └──────────┬────────────────┘
                  │
             [Spring]
         ContactoRestController
                  │
         ContactoService
                  │
         ContactoRepository
             (PESSIMISTIC_WRITE)
                  │
               [JPA]
```

Candidate export now flows through the already-Spring-backed `/api/v1/applications` list, so vacancy metadata is present and the CSV regains correct vacancy titles.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/.../domain/model/Contacto.java` | Modify | Add `subject`, `personKey`, `updatedAt` fields; remove `tipo` (not used by Next contract) |
| `backend/.../infrastructure/ContactoRepository.java` | Create | JPA repo with `findByPersonKeyAndSubject` + `@Lock(PESSIMISTIC_WRITE)` for 24h dedupe |
| `backend/.../application/ContactoService.java` | Create | Domain service: submit (dedupe + create), list, getById, updateStatus (with transition validation), delete |
| `backend/.../presentation/ContactoRestController.java` | Create | `GET/POST /api/v1/contacts`, `GET/PATCH/DELETE /api/v1/contacts/{id}` |
| `backend/.../application/CandidateAdminService.java` | Create | Manual create (reject duplicate personKey, create `Candidato` + spontaneous `Postulacion`), identity update with conflict check |
| `backend/.../presentation/CandidateRestController.java` | Create | `POST/PATCH /api/v1/candidates` (admin ops, internal-token protected) |
| `backend/.../infrastructure/SecurityConfig.java` | Modify | Add internal-token rules for `/api/v1/contacts/**` and `/api/v1/candidates/**` |
| `src/app/api/contacts/route.ts` | Modify | Remove Prisma; validate + guard + proxy POST/GET to Spring |
| `src/app/api/contacts/[id]/route.ts` | Modify | Remove Prisma; auth/CSRF/audit + proxy GET/PATCH/DELETE to Spring |
| `src/app/api/admin/candidates/route.ts` | Modify | Remove Prisma; auth/CSRF/audit + proxy POST to Spring |
| `src/app/api/admin/candidates/[id]/route.ts` | Modify | Remove Prisma; auth/CSRF/audit + proxy PATCH to Spring |
| `src/app/api/admin/candidates/export/route.ts` | Modify | Remove Prisma query; call Spring `/api/v1/applications`, then `buildCandidateSummaries` + `ExportCandidatesUseCase` |
| `src/lib/dto/contact.ts` | Modify | Decouple from `@prisma/client`; use `ContactStatus` string union; accept Date or string for `createdAt` |
| `src/lib/dto/application.ts` | Modify | Decouple from `@prisma/client`; use `ApplicationStatus` string union |
| `tests/unit/personKeyParity.spec.ts` | Create | Assert Next `buildPersonKey()` and Spring `ApplicationManager.buildPersonKey()` produce identical hashes for same inputs |

## Interfaces / Contracts

**Spring Contact Submit Request** (public, no auth)
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "subject": "string",
  "message": "string"
}
```

**Spring Contact Response**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "subject": "string",
  "message": "string",
  "status": "PENDING|RESPONDED|ARCHIVED",
  "createdAt": "ISO8601"
}
```

**Spring Candidate Manual Create Request**
```json
{
  "candidateName": "string",
  "email": "string",
  "phone": "string",
  "notes": "string"
}
```

**Spring Candidate Update Request**
```json
{
  "candidateName": "string",
  "email": "string",
  "phone": "string"
}
```

**Error Contracts**
- `409 DUPLICATE_SUBMISSION` — contact dedupe reject
- `409 DUPLICATE_CANDIDATE` — candidate manual create conflict
- `409 CANDIDATE_IDENTITY_CONFLICT` — candidate update conflicts with another personKey
- `400 INVALID_CONTACT_TRANSITION` — illegal status move

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `personKey` parity Next ↔ Spring | Vitest: hash identical inputs; Java unit test same assertion |
| Unit | `ContactoService` dedupe + transitions | Spring `@SpringBootTest` with `@Transactional` rollback |
| Unit | `CandidateAdminService` conflict checks | Spring unit tests with in-memory H2 or mocked repo |
| Unit | Next DTO mappers with Spring-shaped inputs | Vitest: pass plain objects, assert output shape |
| Integration | Next contact adapter end-to-end with Spring | Playwright or local e2e against running Spring backend |
| Integration | Candidate export produces correct vacancy metadata | Playwright: create application via Spring, export CSV, assert vacancy title present |
| E2E | Admin contact lifecycle (list → detail → status → delete) | Playwright admin smoke with Spring running |
| E2E | Admin candidate manual create + update | Playwright admin smoke with Spring running |

## Migration / Rollout

No data migration. Cutover is "Spring-only forward": legacy Prisma rows remain in Postgres but are invisible to new flows. Rollback per slice is a code revert to Prisma-backed handlers. JPA data created during the window won't be visible after rollback.

## Open Questions

- [ ] Should Spring `Contacto` table get a composite index on `(personKey, subject, createdAt)` for dedupe query performance, or is `findByPersonKeyAndSubject` with `createdAt >= window` sufficient?
- [ ] Does the candidate export need a dedicated Spring candidate-summary query for large datasets, or is paging the existing `/api/v1/applications` list enough?
