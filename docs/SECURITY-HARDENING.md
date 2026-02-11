# Security Hardening (Production)

## Scope

This document tracks the production hardening baseline implemented for:
- `MIS-67` Security headers and CSP hardening
- `MIS-68` NextAuth cookie and session hardening
- `MIS-69` API data minimization and PII redaction
- `MIS-70` Privacy policy and consent surfaces
- `MIS-71` Shared rate limiting backend
- `MIS-72` Sentry alerting and incident runbook

## MIS-67: Security Headers and CSP

Global headers are configured in `next.config.ts` for all routes:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`

Current CSP allowlists include only required external domains:
- Cloudflare Turnstile
- UploadThing + file CDN domains
- Sentry ingest domains

## MIS-68: NextAuth Cookie and Session Hardening

`src/lib/auth.ts` now defines:
- JWT session strategy with bounded lifecycle:
  - `session.maxAge = 8h`
  - `session.updateAge = 1h`
  - `jwt.maxAge = 8h`
- Secure cookie behavior:
  - `httpOnly: true`
  - `sameSite: 'lax'`
  - `secure` is enabled by default in production, overridable with `SESSION_COOKIE_SECURE`

## MIS-69: API Data Minimization and PII Redaction

Changes applied:
- API list/detail routes for applications/contacts now use explicit `select` and DTO mapping.
- Internal storage fields that are not needed by consumers are excluded from routine responses.
- Centralized log redaction is implemented in `src/lib/redaction.ts` and used by `src/lib/logger.ts`.
- Sensitive context in Sentry/console logs was reduced across form and admin flows.

## MIS-70: Privacy Policy and Consent Surfaces

Implemented:
- New public page: `/privacy` (`src/app/privacy/page.tsx`)
- Footer link to privacy policy (`src/components/Footer.tsx`)
- Processing consent notice in:
  - `src/components/ContactForm.tsx`
  - `src/components/PostularForm.tsx`

## MIS-71: Shared Rate Limiting Backend

`src/lib/rateLimit.ts` now supports:
- Primary: Upstash Redis REST backend (shared across instances)
- Fallback: in-memory local store (development-safe fallback)

Required production env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

These are validated in `src/lib/checkEnv.ts`.

## MIS-72: Sentry Alerting + Runbook

Alert strategy and incident handling process are documented in:
- `docs/INCIDENT-RUNBOOK.md`

Ownership recommendation:
- Primary owner: project maintainer/admin
- Secondary owner: technical backup with Sentry access
