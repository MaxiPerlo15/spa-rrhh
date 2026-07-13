# E2E Coverage Audit (Pre-Deploy)

## Goal

Confirm whether E2E tests cover critical business flows before deployment.

## Current Specs

- `tests/e2e/auth.spec.ts`
- `tests/e2e/vacancies.spec.ts`
- `tests/e2e/applications.spec.ts`
- `tests/e2e/qa-matrix.spec.ts`
- `tests/e2e/admin-panel-operability.spec.ts`
- `tests/e2e/password-reset.spec.ts`
- `tests/e2e/duplicates.spec.ts`
- `tests/e2e/public-forms-retry.spec.ts`

## Covered Flows

- Admin authentication (signin and invalid credentials).
- Public jobs listing and filters.
- Application modal open/close and basic submit path.
- Admin vacancies CRUD (create/edit/state toggle/delete).
- Admin settings persistence after save and reload.
- Admin notifications read/unread, clear-read, and panel state transitions.
- Admin applications and contacts detail dialogs plus delete confirmations.
- Password reset complete flow with a valid token.
- Public duplicate submission protection for contacts and applications.
- Public contact and application retry / loading / failure UX in browser E2E.
- Cross-browser smoke paths via `qa-matrix`.

## Missing / Incomplete Flows

- None from the original audit list. Component tests still cover the same flows as a lower-level safety net.

## Pre-Deploy Recommendation

- Treat the list above as release-blocking for production.
- Keep `qa-matrix` as cross-browser smoke gate.
