# Design: Move Application Intake to Spring

## Technical Approach
Move application write-side ownership from Next/Prisma to Spring/JPA. Next `/api/applications` becomes a thin BFF adapter: validates request shape, enforces public guard (POST) or admin session (GET), then forwards to Spring `POST/GET /api/v1/applications` with the internal API token. Spring owns vacancy validation, candidate identity (`personKey`), 24h duplicate detection, and persistence. Admin list data is served from Spring and mapped through existing Next DTOs.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|---|---|---|---|
| Schema parity | Full RFC-001 rename vs add missing columns only | Full rename expands scope beyond intake slice; missing columns block data loss | Add missing Prisma-parity columns (`personKey`, `resumeUrl`, `resumeFileName`, `resumeKey`, `createdAt`, `updatedAt` to `Candidato`; `updatedAt` and spontaneous support to `Postulacion`). Keep existing Spanish table/column names. RFC-001 rename happens in a later slice. |
| Concurrency-safe duplicate check | PostgreSQL advisory lock vs SELECT FOR UPDATE vs unique constraint | Advisory locks are PostgreSQL-specific; unique constraint cannot express 24h window; pessimistic read lock is portable and sufficient | `SELECT FOR UPDATE` on `Candidato` by `personKey` within `@Transactional`. This serializes concurrent submissions for the same identity. |
| Vacancy validation ownership | Next pre-check vs Spring-only | Next pre-check adds latency; Spring-only is simpler but Spring must return clear error codes | Spring-only. Spring validates vacancy existence and `canReceiveApplications()` during intake. |
| Next adapter POST behavior | Proxy raw body vs map to Spring DTO | Raw proxy preserves field names; mapping adds type safety | Map validated Zod payload to Spring request JSON explicitly to maintain contract clarity. |
| Coexistence | Dual-write vs Spring-only | Dual-write is complex; Spring-only means old Prisma applications are invisible until migration | Spring-only write path. Old Prisma data remains untouched. Admin list reads only new JPA data during this slice. |

## Data Flow

```
Public Client
     │
     ▼
Next /api/applications POST
├─ Zod validation
├─ guardPublicRequest (rate limit + Turnstile)
└─ Forward to Spring /api/v1/applications POST
          │
          ▼
Spring ApplicationRestController
├─ Validate DTO
├─ ApplicationManager.submitApplication()
│   ├─ Compute personKey (SHA-256 email|phone)
│   ├─ Find/lock Candidato by personKey
│   ├─ Upsert Candidato
│   ├─ Find recent Postulacion (24h window)
│   ├─ Validate Vacante (if present)
│   └─ Create Postulacion
└─ Return ApplicationResponse
          │
          ▼
Next maps response → 201/409/400

Admin Client
     │
     ▼
Next /api/applications GET
├─ Validate admin session
└─ Forward to Spring /api/v1/applications GET
          │
          ▼
Spring queries Postulaciones + Candidatos + Vacantes
└─ Return ApplicationListResponse
          │
          ▼
Next maps to ApplicationAdminDto[]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRestController.java` | Create | Exposes POST/GET /api/v1/applications |
| `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationRequest.java` | Create | DTO for intake payload |
| `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationResponse.java` | Create | DTO for single application response |
| `backend/src/main/java/com/meinardi/rrhh/presentation/ApplicationListResponse.java` | Create | DTO for admin list item |
| `backend/src/main/java/com/meinardi/rrhh/application/ApplicationIntakeInputBoundary.java` | Create | Input boundary for intake use case |
| `backend/src/main/java/com/meinardi/rrhh/application/ApplicationListInputBoundary.java` | Create | Input boundary for list use case |
| `backend/src/main/java/com/meinardi/rrhh/application/SubmitApplicationCommand.java` | Create | Command object for intake |
| `backend/src/main/java/com/meinardi/rrhh/application/ApplicationManager.java` | Create | Service implementing both boundaries |
| `backend/src/main/java/com/meinardi/rrhh/infrastructure/PostulacionRepository.java` | Create | JPA repository for Postulacion |
| `backend/src/main/java/com/meinardi/rrhh/infrastructure/CandidatoRepository.java` | Create | JPA repository for Candidato with `findByPersonKey` |
| `backend/src/main/java/com/meinardi/rrhh/domain/model/Candidato.java` | Modify | Add `personKey`, `resumeUrl`, `resumeFileName`, `resumeKey`, `createdAt`, `updatedAt` |
| `backend/src/main/java/com/meinardi/rrhh/domain/model/Postulacion.java` | Modify | Add `updatedAt`, `submittedAt` mapping; add spontaneous factory method |
| `backend/src/main/java/com/meinardi/rrhh/infrastructure/SecurityConfig.java` | Modify | Allow POST/GET /api/v1/applications with internal API token |
| `src/app/api/applications/route.ts` | Modify | Replace Prisma transaction logic with Spring adapter |
| `src/lib/personIdentity.ts` | Modify | Add Java reference comment for SHA-256 parity |

## Interfaces / Contracts

### Spring POST /api/v1/applications
Request body: `ApplicationRequest`
```json
{
  "vacancyId": "string|null",
  "candidateName": "string",
  "email": "string",
  "phone": "string",
  "resumeUrl": "string|null",
  "resumeFileName": "string|null",
  "resumeKey": "string|null",
  "coverLetter": "string|null"
}
```

Success: `201` → `ApplicationResponse`
```json
{
  "id": "uuid",
  "submittedAt": "2026-07-08T12:00:00Z",
  "status": "PENDING"
}
```

Duplicate: `409` → `{ "error": "Ya recibimos una postulación reciente...", "code": "DUPLICATE_SUBMISSION" }`
Invalid vacancy: `400` → `{ "error": "Esta vacante ya no está activa" }`

### Spring GET /api/v1/applications
Query params: `?vacancyId={id}&status={status}`
Auth: `X-Backend-Api-Key` header (required)
Response: `ApplicationListResponse[]`

```json
[
  {
    "id": "uuid",
    "candidateId": "uuid",
    "candidateName": "Juan Perez",
    "email": "juan@example.com",
    "phone": "+54123456789",
    "resumeUrl": "https://ufs.sh/...",
    "resumeFileName": "cv.pdf",
    "coverLetter": "...",
    "status": "PENDING",
    "submittedAt": "2026-07-08T12:00:00Z",
    "vacancy": {
      "id": "uuid",
      "title": "Developer",
      "location": "Buenos Aires"
    }
  }
]
```

### Java personKey
Spring must replicate the SHA-256 logic exactly:
```java
public static String buildPersonKey(String email, String phone) {
    String normalizedEmail = email.trim().toLowerCase();
    String trimmedPhone = phone.trim();
    boolean hasPlus = trimmedPhone.startsWith("+");
    String digits = trimmedPhone.replaceAll("\\D", "");
    String normalizedPhone = hasPlus ? "+" + digits : digits;
    String fingerprint = normalizedEmail + "|" + normalizedPhone;
    return DigestUtils.sha256Hex(fingerprint); // Apache Commons Codec
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `ApplicationManager` duplicate logic, personKey parity, candidate upsert | JUnit + Mockito |
| Integration | Spring POST/GET endpoints with `TestRestTemplate` | `@SpringBootTest` with H2 or Testcontainers PostgreSQL |
| Contract | Next-to-Spring request/response shape alignment | Shared JSON schema assertions in both codebases |
| E2E | Playwright application submission + admin listing | Existing Playwright suite; verify Spring-backed data appears |

## Migration / Rollout

No data migration required for this slice. Spring writes to JPA tables; Prisma `Application`/`Candidate` tables remain untouched. Old Prisma applications are not visible in the new Spring admin list until RFC-001 Phase 2 data migration runs.

Rollback plan: Revert `src/app/api/applications/route.ts` to the current Prisma-backed implementation. Revert Spring `SecurityConfig` and controller additions. No data loss because JPA tables are separate during coexistence.

## Open Questions

- [ ] Should rate limiting / Turnstile enforcement move to Spring in a future slice, or remain in Next as permanent BFF responsibility?
- [ ] How will RFC-001 Phase 2 migrate old Prisma `Candidate`/`Application` rows into JPA tables without breaking `personKey` uniqueness constraints?
