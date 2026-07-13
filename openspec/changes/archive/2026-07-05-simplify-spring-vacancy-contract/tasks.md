# Tasks: Simplify Spring Vacancy Contract

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280-350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Gateway Module (RED)

- [x] 1.1 Create `src/lib/server/springVacancyGateway.test.ts` with failing tests for `mapSpringToDto`, `buildCreatePayload`, `buildUpdatePayload`, `parseSpringError`, `getUnsupportedSpringVacancyFields`, `rejectUnsupportedSpringVacancyFields`, `SpringVacancyWriteError` — cover `CREATED` → `draft`, null `requisitos` → `undefined`, error body with `detail` field, empty unsupported fields, error class `status` property

## Phase 2: Gateway Module (GREEN + REFACTOR)

- [x] 2.1 Create `src/lib/server/springVacancyGateway.ts` exporting `SpringVacancyResponse`, `SpringVacancyCreatePayload`, `SpringVacancyUpdatePayload` types
- [x] 2.2 Implement `mapSpringToDto(vacancy)` — import `normalizeSpringVacancyStatus` from `springBackend.ts`
- [x] 2.3 Implement `buildCreatePayload(data)` and `buildUpdatePayload(data)` — import `normalizeLocation` from `@/lib/utils`
- [x] 2.4 Implement `parseSpringError(errorBody)` — extract message from `{ error, message, detail }` fields
- [x] 2.5 Implement `getUnsupportedSpringVacancyFields(data)` and `rejectUnsupportedSpringVacancyFields(fields)` returning `NextResponse`
- [x] 2.6 Implement `SpringVacancyWriteError` class with `status: number` field
- [x] 2.7 Run `npm run test:unit` — all gateway tests green

## Phase 3: Consumer Refactoring

- [x] 3.1 Refactor `src/app/api/vacancies/route.ts` — import `SpringVacancyResponse`, `mapSpringToDto`, `buildCreatePayload`, `parseSpringError`, `getUnsupportedSpringVacancyFields`, `rejectUnsupportedSpringVacancyFields`, `SpringVacancyWriteError` from gateway; delete local copies (lines 19-102); update `createVacancyInSpring` and `listVacanciesInSpring` to use gateway imports
- [x] 3.2 Refactor `src/app/api/vacancies/[id]/route.ts` — import from gateway; delete local `SpringVacancyResponse` type, `SpringVacancyNotFoundError`, `SpringVacancyBusinessRuleError`, `getSpringErrorMessage`, `getUnsupportedSpringVacancyFields`, `rejectUnsupportedSpringVacancyFields`, `toFrontendVacancyDto`, `toSpringUpdateVacancyPayload`; remove `getVacancyFromSpring` call and `VacancyStatusMachine.assertTransition` from `updateVacancy`; keep mixed-change guard
- [x] 3.3 Refactor `src/lib/server/publicVacancies.ts` — import `SpringVacancyResponse` and `mapSpringToDto` from gateway; delete local type (lines 14-24) and `toFrontendVacancyDto` (lines 26-40)
- [x] 3.4 Refactor `src/lib/server/applicationVacancyMetadata.ts` — import `SpringVacancyResponse` from gateway; delete local type (lines 12-16); keep `isSpringVacancyResponse`, `parseSpringVacancyResponse` runtime validators
- [x] 3.5 Refactor `src/app/api/applications/route.ts` — import `SpringVacancyResponse` from gateway; delete local type (lines 22-32); replace inline status normalization (lines 220-221) with `normalizeSpringVacancyStatus` from `springBackend.ts`

## Phase 4: Test Fixture Updates & Verification

- [x] 4.1 Update `src/lib/__tests__/vacancyRoute.test.ts` — verify tests still pass with gateway imports (fixtures use Spring response shape, should be compatible)
- [x] 4.2 Update `src/lib/__tests__/vacancyDetailRoute.test.ts` — verify tests still pass; update any fixtures that relied on read-before-write mock expectations (the `getVacancyFromSpring` prefetch is removed)
- [x] 4.3 Run `npm run test:unit && npm run test:coverage` — all tests green, thresholds met
- [x] 4.4 Run `npm run typecheck && npm run lint` — clean
