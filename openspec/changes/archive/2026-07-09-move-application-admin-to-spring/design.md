# Design: Move Application Admin Lifecycle to Spring

## Technical Approach

Spring takes ownership of application detail GET, status PATCH, and hard DELETE for `/api/v1/applications/{id}`. Next.js becomes a thin auth + audit adapter: validate admin session via NextAuth, call `auditAdminAction()`, forward to Spring with `X-Backend-Api-Key`, map response. The existing `ApplicationStatusMachine` in Next becomes a read-only reference; Spring replicates the same state transition rules as a standalone domain class. Export is explicitly **out of scope** for this change — it will be addressed separately.

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|----------|--------|----------|--------|
| **Audit location** | Keep in Next adapter vs move to Spring | Next: simpler, matches existing pattern, no JPA audit entity needed. Spring: atomic with transaction, but scope creep. | **Next adapter** — keeps audit migration for Day 10 |
| **State machine implementation** | Standalone `ApplicationStatusMachine` class vs entity method guards | Class: testable in isolation, clearer domain logic, matches Next pattern. Entity methods: easy to call from service, but harder to unit test in isolation. | **Standalone class** in `domain/model` + entity delegates to it |
| **Optimistic locking** | Add `@Version` to `Postulacion` vs defer | Add: prevents lost updates. Defer: current Next code has no such guard either, so not a regression. | **Defer** — no `@Version` yet; document as follow-up |
| **Spring response DTO shape** | Reuse `ApplicationListResponse` fields vs new `ApplicationDetailResponse` | Reuse: less code. New: clearer contract, allows embedding full `Candidato` + `Vacante`. | **New `ApplicationDetailResponse`** with full candidate and vacancy metadata |
| **PATCH endpoint style** | `PATCH /{id}/status` (dedicated) vs `PATCH /{id}` (generic) | Dedicated: clearer intent, smaller payload, safer. Generic: more RESTful, but risks over-posting. | **Dedicated `/status`** — matches proposal and reduces risk |

## Data Flow

```
Admin UI ──→ Next.js /api/applications/[id]
                │
                ├─→ auth() → 401 if not ADMIN
                ├─→ rejectIfUntrustedOrigin() → 403
                ├─→ auditAdminAction() (DENIED on auth fail)
                │
                ├─→ Spring /api/v1/applications/{id}
                │       ├── SecurityConfig → X-Backend-Api-Key check
                │       ├── ApplicationRestController
                │       ├── ApplicationManager
                │       ├── PostulacionRepository (JOIN FETCH)
                │       └── ApplicationStatusMachine
                │
                ├─→ auditAdminAction() (SUCCESS/ERROR)
                └─→ map response → NextResponse.json()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/main/java/.../presentation/ApplicationRestController.java` | Modify | Add `GET /{id}`, `PATCH /{id}/status`, `DELETE /{id}` handlers |
| `backend/src/main/java/.../application/ApplicationManager.java` | Modify | Add `getById()`, `updateStatus()`, `delete()` transactional methods |
| `backend/src/main/java/.../application/ApplicationAdminInputBoundary.java` | Create | Interface for admin lifecycle operations |
| `backend/src/main/java/.../presentation/ApplicationDetailResponse.java` | Create | DTO with full candidate + vacancy metadata |
| `backend/src/main/java/.../presentation/ApplicationStatusUpdateRequest.java` | Create | DTO for status PATCH payload (record) |
| `backend/src/main/java/.../domain/model/ApplicationStatusMachine.java` | Create | Standalone state machine replicating Next's rules |
| `backend/src/main/java/.../domain/model/Postulacion.java` | Modify | Fix `ponerEnRevision()`, `marcarComoEntrevistado()`, `rechazar()` to delegate to machine |
| `backend/src/main/java/.../infrastructure/PostulacionRepository.java` | Modify | Add `findByIdWithCandidatoAndVacante()` with JOIN FETCH |
| `backend/src/main/java/.../infrastructure/SecurityConfig.java` | Modify | Add `GET/PATCH/DELETE /api/v1/applications/{id}` rules with `X-Backend-Api-Key` |
| `src/app/api/applications/[id]/route.ts` | Modify | Replace Prisma CRUD with Spring delegation via new gateway |
| `src/lib/server/springApplicationGateway.ts` | Create | Gateway module: `getApplication()`, `updateApplicationStatus()`, `deleteApplication()`, error parsing |
| `src/lib/dto/application.ts` | Modify | Ensure `toApplicationAdminDto()` handles Spring-shaped detail response |

## Interfaces / Contracts

### Spring API Contract

```java
// GET /api/v1/applications/{id}
// Response: ApplicationDetailResponse
{
  "id": "uuid",
  "candidateId": "uuid",
  "candidateName": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+5491112345678",
  "resumeUrl": "https://...",
  "resumeFileName": "cv.pdf",
  "coverLetter": "...",
  "status": "PENDING",
  "submittedAt": "2026-07-08T10:00:00Z",
  "vacancy": {
    "id": "uuid",
    "title": "Developer",
    "location": "Buenos Aires"
  }
}

// PATCH /api/v1/applications/{id}/status
// Request: { "status": "REVIEWING" }
// Response: same as GET (updated)
// Errors: 400 for invalid transition, 404 for missing, 409 for same-state

// DELETE /api/v1/applications/{id}
// Response: 200 with { "success": true }
```

### Next Gateway Types

```typescript
// src/lib/server/springApplicationGateway.ts
export type SpringApplicationDetailResponse = {
  id: string
  candidateId: string
  candidateName: string
  email: string
  phone: string
  resumeUrl: string | null
  resumeFileName: string | null
  coverLetter: string | null
  status: string
  submittedAt: string
  vacancy: { id: string; title: string; location: string } | null
}

export type SpringApplicationStatusUpdatePayload = {
  status: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `ApplicationStatusMachine` — all 7 valid transitions + 4 invalid + same-state rejection | JUnit 5, parameterized tests |
| Unit | `Postulacion` entity methods — delegation to machine, `aceptar()` still works | JUnit 5 |
| Unit | `ApplicationManager` — get/update/delete with mocked repository | Mockito + JUnit |
| Integration | `ApplicationRestController` — GET 200, PATCH 400/404, DELETE 200/404 | `@SpringBootTest` with `TestRestTemplate` |
| Unit (Next) | `springApplicationGateway` — fetch delegation, error parsing, 404 mapping | Vitest with mocked `fetch` |
| Unit (Next) | `[id]/route.ts` — auth denied → 401, Spring success → 200 + audit call | Vitest with mocked `auth`, `auditAdminAction` |
| E2E | Playwright: admin changes application status, detail page reflects it | Existing Playwright admin flows |

## Migration / Rollout

No migration required. `BACKEND_URL` env var acts as the feature flag:
- **Absent**: Next adapter returns `503 Service Unavailable` (no Prisma fallback for this flow; Spring/JPA is authoritative).
- **Present**: Next delegates to Spring.

Rollback: remove `BACKEND_URL` or revert `[id]/route.ts` to Prisma-backed version. Old Prisma `Application` rows remain untouched — they will 404 on Spring detail until RFC-001 data migration, which is an accepted coexistence gap.

## Open Questions

- [x] Should Spring `DELETE` return `204 No Content` or `200 {success:true}`? Next currently returns `200 {success:true}` — keep parity.
- [x] Does Spring need `updatedAt` mutation on status change? Next currently does not update `updatedAt`. Match existing behavior.
- [x] Export will be handled in a separate change — confirmed out of scope.
