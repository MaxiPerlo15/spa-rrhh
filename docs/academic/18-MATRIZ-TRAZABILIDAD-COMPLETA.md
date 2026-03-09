# 18. Matriz de Trazabilidad Completa (RF ↔ RNF ↔ RN ↔ CU ↔ API ↔ Test)

## 1. Convenciones

- Referencias de requisitos: `RF-*`, `RNF-*`, `RN-*` definidos en `04-RF-RNF-RN.md`.
- CU: definidos en `05-CASOS-DE-USO.md`.
- API: endpoint principal asociado al CU.
- Test: evidencia existente (E2E o unit).

## 2. Matriz principal

Tabla 18-01. Matriz de trazabilidad principal.

| CU | RF | RNF | RN | API principal | Tests asociados |
|---|---|---|---|---|---|
| CU-001 | RF-01 | RNF-07, RNF-08 | RN-02 | `GET /api/vacancies` | `tests/e2e/qa-matrix.spec.ts` (home/jobs), `tests/e2e/api-smoke.spec.ts` |
| CU-002 | RF-02 | RNF-07, RNF-08 | RN-02 | `GET /api/vacancies` + filtros UI | `tests/e2e/applications.spec.ts`, `tests/e2e/qa-matrix.spec.ts` |
| CU-003 | RF-03 | RNF-01, RNF-03, RNF-10 | RN-03 | `POST /api/applications` | `tests/e2e/applications.spec.ts`, `src/lib/__tests__/application.test.ts`, `formValidationPolicy.test.ts`, `rateLimit.test.ts`, `uploadPolicy.test.ts` |
| CU-004 | RF-04 | RNF-01, RNF-03, RNF-10 | RN-04 | `POST /api/contacts` | `tests/e2e/qa-matrix.spec.ts` (contact), `src/lib/__tests__/contact.test.ts`, `formValidationPolicy.test.ts`, `rateLimit.test.ts` |
| CU-005 | RF-05 | RNF-01, RNF-03, RNF-04, RNF-08 | RN-01, RN-08 | `POST /api/auth/[...nextauth]` (credentials) | `tests/e2e/auth.spec.ts`, `qa-matrix.spec.ts`, `authAttemptGuard.test.ts` |
| CU-006 | RF-06 | RNF-01, RNF-03, RNF-04, RNF-08 | RN-05, RN-08 | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `tests/e2e/qa-matrix.spec.ts`, `src/lib/__tests__/passwordReset.test.ts`, `authAttemptGuard.test.ts`, `rateLimit.test.ts` |
| CU-007 | RF-07 | RNF-01, RNF-06, RNF-08 | RN-01, RN-06 | `POST /api/vacancies` | `tests/e2e/vacancies.spec.ts`, `vacancies.test.ts`, `useAdminDashboard.test.ts` |
| CU-008 | RF-08 | RNF-01, RNF-07, RNF-08 | RN-01 | `GET /api/vacancies?all=1` | `tests/e2e/vacancies.spec.ts`, `qa-matrix.spec.ts`, `vacancies.test.ts` |
| CU-009 | RF-09 | RNF-01, RNF-06, RNF-08 | RN-06 | `PATCH /api/vacancies/[id]` | `tests/e2e/vacancies.spec.ts`, `vacancies.test.ts`, `useAdminDashboard.test.ts` |
| CU-010 | RF-11 | RNF-01, RNF-06, RNF-08 | RN-06 | `DELETE /api/vacancies/[id]` | `tests/e2e/vacancies.spec.ts`, `vacancies.test.ts`, `useAdminDashboard.test.ts` |
| CU-011 | RF-12 | RNF-01, RNF-07, RNF-08 | RN-01 | `GET /api/applications` | `tests/e2e/qa-matrix.spec.ts`, `application.test.ts`, `useAdminDashboard.test.ts` |
| CU-012 | RF-13 | RNF-01, RNF-07 | RN-01 | `GET /api/applications/[id]` | `application.test.ts`, `adminActions.a11y.test.tsx` |
| CU-013 | RF-14 | RNF-01, RNF-06, RNF-08 | RN-06 | `PATCH /api/applications/[id]` | `application.test.ts`, `useAdminDashboard.test.ts` |
| CU-014 | RF-15 | RNF-01, RNF-06, RNF-08 | RN-06 | `DELETE /api/applications/[id]` | `application.test.ts`, `useAdminDashboard.test.ts` |
| CU-015 | RF-16 | RNF-01, RNF-07, RNF-08 | RN-01 | `GET /api/contacts` | `tests/e2e/qa-matrix.spec.ts`, `contact.test.ts`, `useAdminDashboard.test.ts` |
| CU-016 | RF-17 | RNF-01, RNF-07 | RN-01 | `GET /api/contacts/[id]` | `contact.test.ts`, `adminActions.a11y.test.tsx` |
| CU-017 | RF-18 | RNF-01, RNF-06, RNF-08 | RN-06 | `PATCH /api/contacts/[id]` | `contact.test.ts`, `useAdminDashboard.test.ts` |
| CU-018 | RF-19 | RNF-01, RNF-06, RNF-08 | RN-06 | `DELETE /api/contacts/[id]` | `contact.test.ts`, `useAdminDashboard.test.ts` |
| CU-019 | RF-20 | RNF-01, RNF-07, RNF-08 | RN-01 | `GET/PATCH /api/admin/settings` | `adminSettings.a11y.test.tsx`, `qa-matrix.spec.ts` |
| CU-020 | RF-21, RF-22, RF-23 | RNF-01, RNF-07, RNF-08 | RN-01 | `GET/POST/DELETE /api/admin/notifications`, `PATCH/DELETE /api/admin/notifications/[id]` | `adminHeader.a11y.test.tsx`, `qa-matrix.spec.ts` |
| CU-021 | RF-24 | RNF-01, RNF-06, RNF-09 | RN-06 | `GET /api/admin/audit` | `qa-matrix.spec.ts` (smoke admin), `auditRetention.test.ts` (política relacionada) |
| CU-022 | RF-25 | RNF-01, RNF-06, RNF-08 | RN-07 | `POST /api/internal/audit-retention` | `auditRetention.test.ts` |

## 3. Cobertura y huecos detectados

### 3.1 Cobertura fuerte
- Flujos críticos de autenticación admin.
- CRUD vacantes admin.
- Formularios públicos (postulación/contacto).
- Anti-abuso/rate limiting (unit + parte e2e/smoke).

### 3.2 Cobertura parcial
- CU-021 (auditoría): cubierto principalmente como smoke funcional; no hay E2E dedicado de filtros avanzados con asserts de dataset.
- CU-022 (purga): cobertura unitaria del servicio, sin E2E/contract test del endpoint con secret real en pipeline pública.

### 3.3 Cobertura faltante estricta (si querés auditoría académica máxima)
- Faltan tests de integración API-level por cada alternativo/excepción de todas las rutas admin (actualmente se cubren principales y varios negativos, pero no exhaustivo por transición de estado).

Tabla 18-02. Hallazgos de trazabilidad pendiente.

| ID | Tipo | Descripción | Severidad |
|---|---|---|---|
| TZ-01 | Cobertura E2E | CU-021 sin E2E dedicado de filtros con asserts de dataset | Media |
| TZ-02 | Cobertura contrato API | CU-022 sin contract test de endpoint interno con secret en pipeline pública | Media |
| TZ-03 | Exhaustividad alternativos | No están testeados todos los alternativos/excepciones por cada endpoint admin | Media |
