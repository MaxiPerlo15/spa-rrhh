# Tasks: Move Contact and Candidate Operations to Spring

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–850 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Contact slice) → PR 2 (Candidate slice) |
| Delivery strategy | feature-branch-chain |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contact Spring backend + Next adapter cutover | PR 1 | Includes entity, repo, service, controller, SecurityConfig, Next adapters, DTO decouple, personKey parity test. Self-contained — candidates untouched. |
| 2 | Candidate Spring backend + Next adapter cutover + export fix | PR 2 | Depends on PR 1 (shared SecurityConfig, DTO changes). Includes CandidateAdminService, CandidateRestController, Next candidate adapters, export source switch. |

## Phase 1: Foundation — Contacto Entity & Infrastructure

- [x] 1.1 Modify `backend/.../domain/model/Contacto.java`: add `subject` (String), `personKey` (String, indexed), `updatedAt` (OffsetDateTime, `@PreUpdate`); remove `tipo` field
- [x] 1.2 Create `backend/.../infrastructure/ContactoRepository.java`: `findByPersonKeyAndSubject` with `@Lock(LockModeType.PESSIMISTIC_WRITE)`, `findByPersonKeyAndSubjectAndCreatedAtAfter`
- [x] 1.3 Create `backend/.../application/ContactoService.java`: submit (dedupe + create PENDING), list, getById, updateStatus (ContactStatusMachine parity), delete
- [x] 1.4 Create `backend/.../presentation/ContactoRestController.java`: `POST /api/v1/contacts` (public), `GET/GET{id}/PATCH{id}/DELETE{id}` (internal-token)
- [x] 1.5 Modify `backend/.../infrastructure/SecurityConfig.java`: add rules for `POST /api/v1/contacts` (permitAll), `GET/PATCH/DELETE /api/v1/contacts/**` (internal-token)

## Phase 2: Next Contact Adapters & DTO Decoupling

- [x] 2.1 Modify `src/lib/dto/contact.ts`: replace `Contact['status']` with `ContactStatus` string union; accept `Date | string` for `createdAt`; remove `@prisma/client` import
- [x] 2.2 Modify `src/lib/dto/application.ts`: replace `ApplicationStatus`/`Vacancy` Prisma types with string unions; remove `@prisma/client` import
- [x] 2.3 Modify `src/app/api/contacts/route.ts`: remove Prisma; POST keeps `guardPublicRequest()` then proxies to Spring; GET proxies to Spring with internal-token
- [x] 2.4 Modify `src/app/api/contacts/[id]/route.ts`: remove Prisma; auth/CSRF/audit remain in Next; proxy GET/PATCH/DELETE to Spring; remove local `ContactStatusMachine`
- [x] 2.5 Create `tests/unit/personKeyParity.spec.ts`: assert Next `buildPersonKey()` and Spring `ApplicationManager.buildPersonKey()` produce identical SHA-256 for same inputs

## PR1 Verify Cleanup

- [x] C.1 Add GET success-path test for contacts list (`contactsRoute.test.ts`)
- [x] C.2 Add GET success-path test for contact detail (`contactStatusRoute.test.ts`)
- [x] C.3 Strengthen shape-only assertions in `contactDto.test.ts` — replace toHaveProperty with concrete toBe

## Phase 3: Candidate Spring Backend

- [x] 3.1 Create `backend/.../application/CandidateAdminService.java`: manual create (reject duplicate personKey → 409, create Candidato + spontaneous Postulacion), identity update with conflict check → 409 CANDIDATE_IDENTITY_CONFLICT
- [x] 3.2 Create `backend/.../presentation/CandidateRestController.java`: `POST /api/v1/candidates`, `PATCH /api/v1/candidates/{id}` (internal-token protected)
- [x] 3.3 Modify `backend/.../infrastructure/SecurityConfig.java`: add internal-token rules for `/api/v1/candidates/**`

## Phase 4: Next Candidate Adapters & Export Cutover

- [x] 4.1 Modify `src/app/api/admin/candidates/route.ts`: remove Prisma; auth/CSRF/audit + proxy POST to Spring
- [x] 4.2 Modify `src/app/api/admin/candidates/[id]/route.ts`: remove Prisma; auth/CSRF/audit + proxy PATCH to Spring
- [x] 4.3 Modify `src/app/api/admin/candidates/export/route.ts`: remove Prisma query; call Spring `/api/v1/applications` with internal-token, pass through `buildCandidateSummaries()` + `ExportCandidatesUseCase`

## Phase 5: Testing & Verification

- [x] 5.1 Run `npm run typecheck` — verify no `@prisma/client` imports remain in contact/candidate DTOs
- [x] 5.2 Run `npm run lint` — verify clean
- [x] 5.3 Run `npm run test:unit` — verify all Vitest tests pass including personKey parity
- [ ] 5.4 Run `npx playwright test tests/e2e/api-smoke.spec.ts` — verify `/api/contacts` and `/api/admin/candidates` endpoints respond correctly
