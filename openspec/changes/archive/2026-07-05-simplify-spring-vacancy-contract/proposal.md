# Proposal: Simplify Spring Vacancy Contract

## Intent

Eliminate duplicated Spring vacancy types, translation logic, and error parsing spread across 5 files. Reduce Next's redundant mediation of Spring business rules by removing the read-before-write round trip in `[id]/route.ts`.

## Scope

### In Scope
- Extract shared `SpringVacancyResponse` type and `toFrontendVacancyDto` mapper into one module
- Extract shared `getSpringErrorMessage`, `getUnsupportedSpringVacancyFields`, and Spring payload builders into same module
- Remove read-before-write + `VacancyStatusMachine.assertTransition` validation from `[id]/route.ts` — trust Spring's business-rule responses
- Update `publicVacancies.ts`, `applicationVacancyMetadata.ts`, and `applications/route.ts` to consume new shared module
- Rewrite route test fixtures that encode duplicated contract shapes

### Out of Scope
- Removing `normalizeSpringVacancyStatus` (Spring still returns `CREATED`, Next consumers expect `draft`)
- Removing `getUnsupportedSpringVacancyFields` (Spring still lacks `salary`/`benefits` support)
- Narrowing Next API schemas or admin UI to match Spring-only fields
- Touching Spring backend itself

## Capabilities

### New Capabilities
- `spring-vacancy-gateway`: Shared module owning the Spring vacancy response type, DTO translation, payload builders, error parsing, and unsupported-field detection — consumed by all Next routes that talk to Spring vacancies

### Modified Capabilities
None

## Approach

Create `src/lib/server/springVacancyGateway.ts` consolidating:
- `SpringVacancyResponse` type
- `toFrontendVacancyDto(data): VacancyDto` mapper
- `getSpringErrorMessage(errorBody): string`
- `getUnsupportedSpringVacancyFields(data)` + `rejectUnsupportedSpringVacancyFields(fields)`
- `toSpringCreateVacancyPayload(data)` + `toSpringUpdateVacancyPayload(data)`
- `SpringVacancyWriteError` / `SpringVacancyBusinessRuleError` (unified error classes)

Then refactor consumers: `vacancies/route.ts`, `vacancies/[id]/route.ts`, `publicVacancies.ts`, `applicationVacancyMetadata.ts`, and `applications/route.ts` to import from this module instead of redefining their own copies. In `[id]/route.ts`, drop `getVacancyFromSpring` prefetch and `VacancyStatusMachine.assertTransition` — let Spring return 400/409 on invalid transitions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/server/springVacancyGateway.ts` | New | Shared Spring vacancy contract module |
| `src/app/api/vacancies/route.ts` | Modified | Import from gateway, drop local copies |
| `src/app/api/vacancies/[id]/route.ts` | Modified | Import from gateway, remove read-before-write + status prevalidation |
| `src/lib/server/publicVacancies.ts` | Modified | Import from gateway, drop local copies |
| `src/lib/server/applicationVacancyMetadata.ts` | Modified | Import from gateway for shared type |
| `src/app/api/applications/route.ts` | Modified | Import from gateway, drop inline status normalization |
| `tests/**` (route-level tests) | Modified | Rewrite fixtures against gateway types |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing VacancyStatusMachine validation lets invalid transitions hit Spring with different error messages | Low | Spring already returns 400/409 with `CAMBIO_DE_ESTADO_NOT_ALLOWED`; next retains its own error formatting |
| Test fixture rewrites miss edge cases | Medium | Run `npm run test:unit` and `npm run test:coverage` after each consumer refactor |
| Central module ripple affects middleware-unaware imports | Low | Gateway exports are server-only; no client boundary crossing |

## Rollback Plan

Revert the commit. All internal changes — no DB migration, no API contract change. `git revert` restores the previous scattered contract instantly.

## Dependencies

- None (Spring backend unchanged; no new packages)

## Success Criteria

- [ ] All 5 consumers import `SpringVacancyResponse` / `toFrontendVacancyDto` from `springVacancyGateway.ts` (zero local type redeclarations)
- [ ] `[id]/route.ts` no longer calls `getVacancyFromSpring` before mutation operations
- [ ] `npm run test:unit && npm run test:coverage` pass with thresholds
- [ ] `npm run typecheck && npm run lint` pass
