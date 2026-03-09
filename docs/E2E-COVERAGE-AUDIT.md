# E2E Coverage Audit (Pre-Deploy)

## Goal

Confirm whether E2E tests cover critical business flows before deployment.

## Current Specs

- `tests/e2e/auth.spec.ts`
- `tests/e2e/vacancies.spec.ts`
- `tests/e2e/applications.spec.ts`
- `tests/e2e/qa-matrix.spec.ts`

## Covered Flows

- Admin authentication (signin and invalid credentials).
- Public jobs listing and filters.
- Application modal open/close and basic submit path.
- Admin vacancies CRUD (create/edit/state toggle/delete).
- Cross-browser smoke paths via `qa-matrix`.

## Missing / Incomplete Flows

- Admin notifications:
  - list dropdown
  - mark as read
  - delete one
  - clear read
- Admin settings:
  - toggle switches
  - save and persistence after reload
- Password reset complete flow with a valid token (not only missing-token state).
- Admin contacts and applications destructive actions:
  - open details dialog
  - delete confirmation and post-delete state
- Duplicate submission path (`409 DUPLICATE_SUBMISSION`) for:
  - postulation form
  - contact form
- API error + retry UI paths (loading/failure/retry) in public forms.

## Pre-Deploy Recommendation

- Treat the list above as release-blocking for production.
- Keep `qa-matrix` as cross-browser smoke gate.
- Add focused E2E files per domain:
  - `tests/e2e/admin-notifications.spec.ts`
  - `tests/e2e/admin-settings.spec.ts`
  - `tests/e2e/password-reset.spec.ts`
  - `tests/e2e/duplicates.spec.ts`
