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
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`

Current CSP allowlists include only required external domains:
- Cloudflare Turnstile
- UploadThing + file CDN domains
- Sentry ingest domains

As of March 10, 2026, CSP is delivered from `src/proxy.ts` for every HTML route:
- per-request nonce for app and admin pages
- `script-src` with per-request nonce
- `strict-dynamic` for runtime scripts
- nonce propagation to `next/script` consumers (`schema.org`, Turnstile)

Why this changed:
- a static CSP in `next.config.ts` forced a global `unsafe-inline` exception
- route-level CSP from proxy allows stronger `script-src` without keeping a weak baseline for the whole app

Operational note:
- `/api/*` routes do not emit CSP because they are not HTML surfaces
- CORS and origin validation remain handled in `src/proxy.ts`

## MIS-68: NextAuth Cookie and Session Hardening

`src/lib/auth.ts` now defines:
- JWT session strategy with bounded lifecycle:
  - `session.maxAge = 8h`
  - `session.updateAge = 1h`
  - `jwt.maxAge = 8h`
- Secure cookie behavior:
  - `httpOnly: true`
  - `sameSite: 'lax'`
  - `secure` forced in production
  - optional local override only in desarrollo (`SESSION_COOKIE_SECURE=true`)
  - `SESSION_COOKIE_SAME_SITE` soporta `lax|strict|none` (si `none` sin HTTPS, se fuerza `lax`)

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
- Fallback: in-memory local store only in non-production environments

Production fail-safe:
- If Upstash is unavailable (network/provider failure), requests are denied (`fail-closed`) instead of silently using local memory.
- This avoids per-instance bypasses in serverless/multi-instance runtime.

Required production env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

These are validated in `src/lib/checkEnv.ts`.

## MIS-81: Cross-Origin Policy Hardening

Implemented baseline:
- Centralized origin checks in `src/middleware.ts` for all `/api/*` requests.
- Explicit preflight (`OPTIONS`) handling with controlled CORS response headers.
- Strict allowlist resolution from:
  - `NEXTAUTH_URL` origin (default app origin)
  - optional `CORS_ALLOWED_ORIGINS` (comma-separated additional origins)
- Requests with foreign `Origin` outside allowlist are rejected with `403`.

Configuration:
- Add additional trusted origins via `CORS_ALLOWED_ORIGINS`.
- Keep allowlist minimal per environment.

## MIS-82: Forms Validation Policy (Email + Phone)

Implemented baseline:
- Shared validation policy in `src/lib/formValidationPolicy.ts`.
- Backend Zod schemas (`src/lib/apiValidation.ts`) now enforce:
  - optional domain allowlist for emails
  - disposable email blocking
  - phone format and digit-length validation
- Public forms (`ContactForm` and `PostularForm`) reuse the same policy for consistent UX.
- API clients surface first backend validation detail to users when available.

## MIS-110: Detección de duplicados sin usuario autenticado

Implementado:
- Huella de identidad `personKey` en backend (`sha256(email_normalizado|telefono_normalizado)`).
- Persistencia en:
  - `Application.personKey`
  - `Contact.personKey`
- Deduplicación temporal (24h):
  - Postulación: misma vacante + mismo `personKey` => `409 DUPLICATE_SUBMISSION`
  - Contacto: mismo asunto + mismo `personKey` => `409 DUPLICATE_SUBMISSION`
- UX:
  - formularios muestran feedback informativo cuando el envío es duplicado (no error genérico).

Notas:
- Si la migración de `personKey` aún no está aplicada, el backend degrada sin romper.
- En producción, estos fallbacks ya no se aceptan silenciosamente. Si falta una migración, la ruta debe fallar de forma visible.

Configuration:
- `FORM_ALLOWED_EMAIL_DOMAINS`: comma-separated email domain allowlist.
  - Empty means no allowlist restriction.
- `FORM_BLOCK_DISPOSABLE_EMAILS`: defaults to `true`.
- `NEXT_PUBLIC_FORM_ALLOWED_EMAIL_DOMAINS`: optional client-side mirror to align instant UI validation with server policy.

## MIS-77: Forgot Password and Secure Reset

Implemented baseline:
- Public admin recovery pages:
  - `/admin/forgot-password`
  - `/admin/reset-password`
- Endpoints:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- One-time token strategy:
  - random token generated server-side
  - stored hashed (`sha256`) in database
  - token expiration (`PASSWORD_RESET_TOKEN_TTL_MINUTES`)
  - invalidated after successful password change
- Real delivery requirement:
  - forgot-password keeps a generic public response even when email delivery fails
  - reset token is removed if delivery fails (no dangling usable token)
- Anti-abuse controls:
  - rate limiting in forgot/reset endpoints
  - generic response in forgot endpoint to avoid user enumeration.
- Reset UX hardening:
  - password strength thermometer on `/admin/reset-password`
  - live checklist of password requirements for safer credential setup.

## MIS-72: Sentry Alerting + Runbook

Alert strategy and incident handling process are documented in:
- `docs/INCIDENT-RUNBOOK.md`

Ownership recommendation:
- Primary owner: project maintainer/admin
- Secondary owner: technical backup with Sentry access

## MIS-93: Login/Reset Attempt Controls

Implemented baseline:
- Login throttling by identity (`email + ip`) with temporary lock escalation:
  - 5 fallos => 10 minutos
  - 8 fallos => 30 minutos
  - 10 fallos => 2 horas
- Successful login clears lock state for that identity.
- Forgot-password and reset-password now include additional temporary lock checks by identity, beyond standard per-IP rate limits.
- Storage model:
  - Uses shared distributed store via Upstash Redis when configured (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
  - In production, no in-memory fallback is used if distributed store fails (`fail-closed`).
  - In development/test, local fallback remains available for DX.

UX behavior:
- Sign-in surface shows a user-friendly cooldown message when login is temporarily blocked.
- Error messages remain generic enough to avoid user enumeration.

Observability hooks:
- Security events are emitted with `logger.security(...)` and sent to Sentry in production with:
  - `tags.category = security`
  - `tags.security_event = <event_name>`
- Current events:
  - `auth.login.failed`
  - `auth.login.throttled`
  - `auth.forgot_password.throttled`
  - `auth.forgot_password.delivery_failed`
- `auth.forgot_password.unknown_identity`
- `auth.reset_password.throttled`
- `auth.reset_password.invalid_token`

## Dependency Risk Acceptance

Status as of March 10, 2026:
- `npm audit --audit-level=high` pasa
- no quedan advisories `high` ni `critical`
- los advisories remanentes son `moderate` y provienen del tooling transitive de Prisma, no de runtime directo de la app

Current accepted residual risk:
- `@prisma/dev`
- `@mrleebo/prisma-ast`
- `chevrotain`
- `lodash`

Acceptance rationale:
- el remanente está en la cadena interna de tooling de Prisma
- la salida automática de `npm audit fix --force` propone un movimiento de Prisma incoherente para este repositorio
- forzar ese cambio solo para silenciar el reporte sería peor ingeniería que registrar el riesgo residual de forma explícita

Required follow-up:
- revisitar este punto en el próximo upgrade planificado de Prisma
- no bajar el gate de CI por debajo de `npm audit --audit-level=high`

## MIS-98: Auditoría de acciones críticas del panel admin

Implementado:
- Nuevo registro persistente de auditoría en base de datos:
  - modelo Prisma `AdminAuditLog`
  - enum `AuditOutcome` (`SUCCESS`, `DENIED`, `ERROR`)
- Migración:
  - `prisma/migrations/20260213193000_add_admin_audit_log/migration.sql`
- Helper central:
  - `src/lib/adminAudit.ts` (`auditAdminAction`)

Acciones auditadas:
- Vacantes:
  - `vacancy.create`
  - `vacancy.update` (incluye cambios de estado cerrar/activar)
  - `vacancy.delete`
- Postulaciones:
  - `application.update_status`
  - `application.delete`
- Contactos:
  - `contact.update_status`
  - `contact.delete`

Metadata registrada (según acción):
- actor (`userId`, `email`)
- `action`, `resourceType`, `resourceId`
- `outcome` (`SUCCESS`, `DENIED`, `ERROR`)
- IP y user-agent
- campos de contexto operacional (por ejemplo estado previo/nuevo)

## MIS-113: Retención y purga automática de auditoría

Implementado:
- Política de retención por criticidad:
  - Auditoría estándar: 90 días.
  - Auditoría sensible de seguridad: 180 días.
- Clasificación sensible:
  - `outcome` en `DENIED` o `ERROR`, o
  - `action` con prefijo `auth.` o `security.`
- Servicio central:
  - `src/lib/auditRetention.ts` (`purgeExpiredAdminAuditLogs`)
- Endpoint interno protegido por secreto:
  - `POST /api/internal/audit-retention`
  - Auth por `Authorization: Bearer <AUDIT_CRON_SECRET>` o header `x-cron-secret`.
- Script manual operativo:
  - `npm run audit:purge` (`scripts/purge-admin-audit.mjs`)

Variables de entorno:
- `AUDIT_CRON_SECRET` (requerida en producción).

## Pre-Deploy Runtime Check

Comandos recomendados antes de desplegar:

```bash
npm run env:check:prod
npm run test:e2e:matrix
npm run build
```
