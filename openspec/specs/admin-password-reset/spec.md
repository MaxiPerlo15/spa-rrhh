# admin-password-reset Specification

## Purpose

Spring owns the complete password reset lifecycle: token generation, email delivery, token validation, and password hash rotation. Next delegates entirely to Spring for these flows.

## Non-Goals

- Vacancy, application, or contact domain migrations
- Admin notification or audit log migration
- Password hash encoder migration (bcrypt stays; encoder upgrade is a future change)

## Requirements

### Requirement: Forgot Password Endpoint

Spring SHALL expose `POST /api/v1/auth/forgot-password` accepting an email address. It MUST generate a reset token, store it against the user, send a reset email, and return a generic success message regardless of whether the email exists.

#### Scenario: Reset requested for existing user

- GIVEN a registered admin email exists in Spring `Usuario`
- WHEN the client POSTs to `/api/v1/auth/forgot-password` with that email
- THEN the response is 200 with a generic confirmation message
- AND a reset token is stored against the `Usuario` record
- AND a reset email is dispatched

#### Scenario: Reset requested for unknown email

- GIVEN no user exists with the provided email
- WHEN the client POSTs to `/api/v1/auth/forgot-password`
- THEN the response is 200 with the same generic confirmation message
- AND no email is sent (no user enumeration)

#### Scenario: Rate limiting

- GIVEN a client has sent multiple forgot-password requests in a short window
- WHEN the rate limit is exceeded
- THEN the response is 429 with a retry-after hint

### Requirement: Reset Password Endpoint

Spring SHALL expose `POST /api/v1/auth/reset-password` accepting a token and new password. It MUST validate the token, rotate the password hash, and invalidate the token.

#### Scenario: Successful password reset

- GIVEN a valid, unexpired reset token and a new password
- WHEN the client POSTs to `/api/v1/auth/reset-password`
- THEN the response is 200 with a success message
- AND the password hash is updated in Spring `Usuario`
- AND the reset token is invalidated

#### Scenario: Expired or invalid token

- GIVEN an expired or non-existent reset token
- WHEN the client POSTs to `/api/v1/auth/reset-password`
- THEN the response is 400 with an error message
- AND no password change occurs

#### Scenario: Token reuse prevention

- GIVEN a valid reset token was already used successfully
- WHEN the client POSTs to `/api/v1/auth/reset-password` with the same token
- THEN the response is 400

### Requirement: Reset Token Expiry

Reset tokens SHALL expire after a configurable duration (default: 1 hour). Expired tokens MUST be rejected by the reset endpoint.

#### Scenario: Token expires after default window

- GIVEN a reset token was generated 1 hour ago
- WHEN the client attempts to use it for reset
- THEN the response is 400 (token expired)

### Requirement: Next Password Reset Routes Removed

`src/app/api/auth/forgot-password/route.ts` and `src/app/api/auth/reset-password/route.ts` SHALL be deleted after Spring endpoints are verified. The admin password reset UI SHALL redirect to or call Spring endpoints directly.

#### Scenario: Old Next routes no longer serve

- GIVEN Spring password reset endpoints are deployed and verified
- WHEN a client hits `src/app/api/auth/forgot-password`
- THEN the route does not exist (404 or no route match)
