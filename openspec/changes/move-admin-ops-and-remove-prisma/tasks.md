# Tasks: Notification Session-Rotation Corrective Slice

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 220–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single corrective PR |
| Delivery strategy | ask-on-risk resolved |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Preserve Spring rotation across notification BFF calls | One PR | Routes, focused Vitest, and Spring E2E; ≤300 lines. |

## Phase 1: Collection Adapter Contract

- [x] 1.1 **RED** In `src/lib/__tests__/adminNotificationsRoute.test.ts`, add a collection GET case where validation returns `S1`; require the upstream request to use `Cookie: SESSIONID=S1` rather than browser `S0`.
- [x] 1.2 **RED** Require that successful collection proxy responses append validation `Set-Cookie: S1` and any upstream Spring `Set-Cookie` without replacing either; require local post-preflight validation/CSRF rejections to retain `S1` and avoid proxying.
- [x] 1.3 **GREEN→REFACTOR** In `src/app/api/admin/notifications/route.ts`, make authorization carry the authorized cookie plus `setCookie`; proxy with the rotated cookie and use `relaySpringCookies()` for every response after successful preflight. Preserve no-store, existing 401/403/503 mapping, and origin/CSRF checks.

## Phase 2: Item Adapter Contract

- [x] 2.1 **RED** In `src/lib/__tests__/adminNotificationByIdRoute.test.ts`, cover PATCH and DELETE after `S0→S1` validation: both forward `S1`, append validation and upstream cookies, and retain `S1` on local PATCH validation/CSRF rejection, including a parsed-invalid PATCH DTO (`safeParse`).
- [x] 2.2 **GREEN→REFACTOR** In `src/app/api/admin/notifications/[id]/route.ts`, apply the same authorization result, rotated upstream cookie, and append-only relay behavior; retain existing method, DTO, no-store, origin/CSRF, and 401/403/503 contracts.

## Phase 3: First-Protected-BFF Regression

- [x] 3.1 **RED** In `tests/e2e/auth-spring-session.spec.ts`, add a Spring-auth scenario that posts credentials to `/api/auth/spring/login`, verifies the relay-installed HttpOnly `/` `SESSIONID`, and calls `/api/admin/notifications` before any `/admin` request.
- [x] 3.2 **GREEN/verify** Require that first protected BFF call to return 200, preserve a browser `SESSIONID`, and authorize direct Spring `/api/v1/auth/me`; do not disable session fixation, relax authorization, or change login/proxy/cookie configuration.

## Phase 4: Focused Verification

- [x] 4.1 Run `npx vitest run src/lib/__tests__/adminNotificationsRoute.test.ts src/lib/__tests__/adminNotificationByIdRoute.test.ts`, then `npx playwright test tests/e2e/auth-spring-session.spec.ts`; record results before completion.
