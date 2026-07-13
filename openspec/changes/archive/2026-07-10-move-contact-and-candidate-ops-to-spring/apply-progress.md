# Apply Progress: Move Contact and Candidate Operations to Spring — PR2 Candidate Slice

## Completed Tasks (Cumulative)

### Phase 1: Foundation — Contacto Entity & Infrastructure
- [x] 1.1 Modify `backend/.../domain/model/Contacto.java`: add subject, personKey, updatedAt; remove tipo
- [x] 1.2 Create `backend/.../infrastructure/ContactoRepository.java`: PESSIMISTIC_WRITE lock
- [x] 1.3 Create `backend/.../application/ContactoService.java`: submit, list, getById, updateStatus, delete
- [x] 1.4 Create `backend/.../presentation/ContactoRestController.java`: REST endpoints
- [x] 1.5 Modify `backend/.../infrastructure/SecurityConfig.java`: contact endpoint rules

### Phase 2: Next Contact Adapters & DTO Decoupling
- [x] 2.1 Modify `src/lib/dto/contact.ts`: ContactStatus union, remove @prisma/client
- [x] 2.2 Modify `src/lib/dto/application.ts`: ApplicationStatus union, remove @prisma/client
- [x] 2.3 Modify `src/app/api/contacts/route.ts`: proxy to Spring
- [x] 2.4 Modify `src/app/api/contacts/[id]/route.ts`: proxy to Spring
- [x] 2.5 Create `src/lib/__tests__/personKeyParity.test.ts`: 7 parity tests

### PR1 Verify Cleanup
- [x] C.1 Add GET success-path test for contacts list (`contactsRoute.test.ts`)
- [x] C.2 Add GET success-path test for contact detail (`contactStatusRoute.test.ts`)
- [x] C.3 Strengthen shape-only assertions in `contactDto.test.ts`

### Phase 3: Candidate Spring Backend (this batch)
- [x] 3.1 Create `CandidateAdminService.java`: manual create (reject duplicate personKey → 409, create Candidato + spontaneous Postulacion), identity update with conflict check → 409 CANDIDATE_IDENTITY_CONFLICT
- [x] 3.2 Create `CandidateRestController.java`: POST /api/v1/candidates, PATCH /api/v1/candidates/{id} (internal-token protected)
- [x] 3.3 Modify `SecurityConfig.java`: add internal-token rules for /api/v1/candidates/**

### Phase 4: Next Candidate Adapters & Export Cutover (this batch)
- [x] 4.1 Modify `src/app/api/admin/candidates/route.ts`: remove Prisma; auth/CSRF/audit + proxy POST to Spring
- [x] 4.2 Modify `src/app/api/admin/candidates/[id]/route.ts`: remove Prisma; auth/CSRF/audit + proxy PATCH to Spring
- [x] 4.3 Modify `src/app/api/admin/candidates/export/route.ts`: remove Prisma query; call Spring /api/v1/applications with internal-token, pass through buildCandidateSummaries() + ExportCandidatesUseCase

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `backend/.../application/CandidateAdminServiceTest.java` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 5 cases (create, dup, update, conflict, not found) | ✅ Clean |
| 3.2 | `backend/.../presentation/CandidateRestControllerTest.java` | Integration | N/A (new) | ✅ Written | ✅ Passed | ✅ 5 cases (create, dup, update, conflict, not found) | ✅ Clean |
| 3.3 | (SecurityConfig existing tests) | Unit | ✅ Existing | N/A (config) | ✅ Existing | ➖ Config only | ✅ Clean |
| 4.1 | `src/lib/__tests__/candidateCreateRoute.test.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 4 cases (proxy, 401, 409, 503) | ✅ Clean |
| 4.2 | `src/lib/__tests__/candidateUpdateRoute.test.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 4 cases (proxy, 401, 409, 503) | ✅ Clean |
| 4.3 | `src/lib/__tests__/candidatesExportRoute.test.ts` | Unit | ✅ Existing | ✅ Rewritten | ✅ Passed | ✅ 3 cases (auth, proxy, 503) | ✅ Clean |

## Test Summary
- **Total tests written**: 16 (5 Java + 4 + 4 + 3 Next)
- **Total tests passing**: 427 (full suite)
- **Layers used**: Unit (Next), Integration (Java)
- **Approval tests** (refactoring): 2 (adminCandidatesRoute + adminCandidateUpdateRoute updated from Prisma to Spring mock)
- **Pure functions created**: 0

## Files Changed (this batch)
| File | Action | What Was Done |
|------|--------|---------------|
| `backend/.../application/CandidateAdminService.java` | Created | Service with manualCreate and updateIdentity methods |
| `backend/.../presentation/CandidateRestController.java` | Created | REST controller for POST and PATCH candidates |
| `backend/.../presentation/CandidateCreateRequest.java` | Created | Request DTO with Jakarta validation |
| `backend/.../presentation/CandidateUpdateRequest.java` | Created | Request DTO with Jakarta validation |
| `backend/.../presentation/CandidateCreateResponse.java` | Created | Response record |
| `backend/.../presentation/CandidateUpdateResponse.java` | Created | Response record |
| `backend/.../presentation/CandidateExceptionHandler.java` | Created | Maps DUPLICATE_CANDIDATE → 409, CANDIDATE_IDENTITY_CONFLICT → 409 |
| `backend/.../infrastructure/SecurityConfig.java` | Modified | Added internal-token rules for POST/PATCH /api/v1/candidates/** |
| `src/app/api/admin/candidates/route.ts` | Modified | Replaced Prisma with Spring proxy (POST) |
| `src/app/api/admin/candidates/[id]/route.ts` | Modified | Replaced Prisma with Spring proxy (PATCH) |
| `src/app/api/admin/candidates/export/route.ts` | Modified | Replaced Prisma with Spring proxy (GET /api/v1/applications) |
| `backend/.../application/CandidateAdminServiceTest.java` | Created | 5 unit tests for service |
| `backend/.../presentation/CandidateRestControllerTest.java` | Created | 5 integration tests for controller |
| `src/lib/__tests__/candidateCreateRoute.test.ts` | Created | 4 unit tests for POST adapter |
| `src/lib/__tests__/candidateUpdateRoute.test.ts` | Created | 4 unit tests for PATCH adapter |
| `src/lib/__tests__/candidatesExportRoute.test.ts` | Modified | Updated from Prisma mock to Spring proxy mock |
| `src/lib/__tests__/adminCandidatesRoute.test.ts` | Modified | Updated from Prisma mock to Spring proxy mock |
| `src/lib/__tests__/adminCandidateUpdateRoute.test.ts` | Modified | Updated from Prisma mock to Spring proxy mock |

## Delivery
- Mode: feature-branch-chain
- Current work unit: PR2 (Candidate slice)
- Strategy: ask-always

## Deviations
None — implementation matches design.

## Status
PR2 candidate slice implementation complete. Phase 3 + Phase 4 done. Phase 5 (verification) partially complete: typecheck ✅, lint ✅, unit tests ✅ (427/427). API smoke pending (requires running backend).
