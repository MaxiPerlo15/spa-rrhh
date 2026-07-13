# Design: Simplify Spring Vacancy Contract

## Technical Approach

Extract duplicated Spring vacancy contract types, mappers, payload builders, error parsing, and unsupported-field detection into `src/lib/server/springVacancyGateway.ts`. Refactor all 5 consumers to import from this module instead of redeclaring their own copies.

Remove the redundant read-before-write round trip and `VacancyStatusMachine.assertTransition` prevalidation from `src/app/api/vacancies/[id]/route.ts`. Spring already returns `400/409` with `CAMBIO_DE_ESTADO_NOT_ALLOWED` on invalid transitions; Next should relay those errors rather than prevalidate. Keep `normalizeSpringVacancyStatus` in `springBackend.ts` because Spring still returns `CREATED` while Next consumers expect `draft`.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|---|---|---|---|
| Gateway scope | Full (types + mappers + fetch helpers) | Centralizes more but couples fetch logic | Types, mappers, payload builders, error parsing, and unified errors only. Fetch functions stay in routes because each route has different auth/audit/cache side effects. |
| Error class unification | Merge `SpringVacancyWriteError` + `SpringVacancyBusinessRuleError` into one | Loses semantic name distinction | Merge into `SpringVacancyWriteError` with `status` field. `[id]/route.ts` currently uses both; routes can branch on `status` (400/409/404) instead of `instanceof`. |
| Read-before-write removal | Remove entirely vs keep for 404 guard | Removing eliminates an extra HTTP round trip per mutation but loses early 404 detection | Remove entirely. Spring returns 404 on unknown IDs; routes already catch that. |
| Mixed-change guard | Keep vs remove | Keep enforces API design; remove simplifies | Keep the "status + business field change must be separate operations" check — it's a Next API contract rule, not a Spring business rule. |
| `normalizeSpringVacancyStatus` location | Move to gateway vs keep in `springBackend.ts` | Moving centralizes all vacancy logic; keeping avoids touching unrelated consumers | Keep in `springBackend.ts`. Gateway imports it; other consumers still use it directly. |

## Data Flow

    Spring Backend ──HTTP──► Route handler
                                  │
                                  ▼
                       springVacancyGateway.ts
                       (mapSpringToDto, parseSpringError,
                        buildCreatePayload, buildUpdatePayload)
                                  │
                                  ▼
                         NextResponse.json(VacancyDto)

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/server/springVacancyGateway.ts` | **Create** | Exports `SpringVacancyResponse`, `SpringVacancyCreatePayload`, `SpringVacancyUpdatePayload`, `mapSpringToDto`, `buildCreatePayload`, `buildUpdatePayload`, `parseSpringError`, `getUnsupportedSpringVacancyFields`, `rejectUnsupportedSpringVacancyFields`, `SpringVacancyWriteError` |
| `src/app/api/vacancies/route.ts` | **Modify** | Import from gateway; drop local type, mapper, error parser, unsupported-field helpers, payload builder, and error class |
| `src/app/api/vacancies/[id]/route.ts` | **Modify** | Import from gateway; drop local copies of all above plus `SpringVacancyBusinessRuleError`; remove `getVacancyFromSpring` and `VacancyStatusMachine.assertTransition`; let Spring own transition errors |
| `src/lib/server/publicVacancies.ts` | **Modify** | Import `SpringVacancyResponse` and `mapSpringToDto` from gateway; drop local type and mapper |
| `src/lib/server/applicationVacancyMetadata.ts` | **Modify** | Import `SpringVacancyResponse` from gateway; keep runtime validation functions (`isSpringVacancyResponse`, `parseSpringVacancyResponse`) because they enforce a stricter subset contract |
| `src/app/api/applications/route.ts` | **Modify** | Import `SpringVacancyResponse` from gateway; replace inline status normalization with `normalizeSpringVacancyStatus` from `springBackend.ts` |

## Interfaces / Contracts

```typescript
// src/lib/server/springVacancyGateway.ts

export type SpringVacancyResponse = {
  id: string
  titulo: string
  descripcion: string
  requisitos?: string | null
  ubicacionNombre?: string | null
  ubicacionDescripcion?: string | null
  jornada: string
  modalidad: string
  estadoActual: string
  fechaCreacion: string
  fechaPublicacion?: string | null
}

export type SpringVacancyCreatePayload = {
  titulo: string
  descripcion: string
  requisitos?: string
  ubicacionNombre?: string
  ubicacionDescripcion?: string
  jornada: string
  modalidad: string
}

export type SpringVacancyUpdatePayload = Partial<SpringVacancyCreatePayload>

export function mapSpringToDto(vacancy: SpringVacancyResponse): VacancyDto
export function buildCreatePayload(data: {
  title: string
  description: string
  location: string
  workday: string
  modality: string
  requirements?: string
}): SpringVacancyCreatePayload

export function buildUpdatePayload(data: {
  title?: string
  description?: string
  location?: string
  workday?: string
  modality?: string
  requirements?: string
}): SpringVacancyUpdatePayload

export function parseSpringError(errorBody: string): string
export function getUnsupportedSpringVacancyFields(
  data: { salary?: string; benefits?: string }
): string[]
export function rejectUnsupportedSpringVacancyFields(fields: string[]): NextResponse

export class SpringVacancyWriteError extends Error {
  readonly status: number
  constructor(status: number, message: string)
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `mapSpringToDto`, `buildCreatePayload`, `buildUpdatePayload`, `parseSpringError`, `getUnsupportedSpringVacancyFields`, `SpringVacancyWriteError` | Add `src/lib/server/springVacancyGateway.test.ts` (Vitest, `node` env). Test edge cases: `CREATED` → `draft`, null `requisitos` → `undefined`, error body with `detail` field, empty unsupported fields. |
| E2E | Admin vacancy CRUD + public application submission | Run existing Playwright specs (`vacancies.spec.ts`, `applications.spec.ts`). They exercise the full Spring → Next → UI flow and will catch any broken mapping or error relay. |

## Migration / Rollout

No migration required. No database changes, no external API contract changes. Pure internal refactoring. Rollback is `git revert`.

## Open Questions

- [ ] The proposal mentions rewriting route test fixtures, but no unit tests for vacancy routes currently exist (`src/**/*.test.ts` pattern). Should we add them as part of this change or defer to a testing-focused slice?
