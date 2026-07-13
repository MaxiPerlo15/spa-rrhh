# spa-rrhh

[![CI](https://github.com/MaxiPerlo15/spa-rrhh/actions/workflows/ci.yml/badge.svg)](https://github.com/MaxiPerlo15/spa-rrhh/actions/workflows/ci.yml)

Plataforma web para **Meinardi&Perlo RRHH** (Las Varillas, Córdoba) con portal público de vacantes y panel administrativo.

## Estado actual (v0.2.x)

- Estado funcional: operativo para flujo core de vacantes, postulaciones y contactos.
- Última auditoría de documentación: **9 de marzo de 2026**.
- Modelo operativo objetivo:
  - `1-5` administradores.
  - `<100` vacantes activas.
  - `<500` postulaciones por mes.

## Qué está implementado

- Portal público:
  - Landing.
  - `/ofertas-laborales` con filtros.
  - Formulario de postulación y formulario de contacto.
- Panel admin:
  - Gestión de vacantes (crear, editar, activar/cerrar, eliminar).
  - Gestión de postulaciones (filtros, detalle, estado, export CSV, eliminación).
  - Gestión de contactos (filtros, detalle, cambio de estado, eliminación).
  - Notificaciones de panel y configuración de cuenta.
  - Onboarding/tutorial guiado.
- Seguridad y operación:
  - Autenticación con NextAuth.
  - Validación de API con Zod.
  - Protección anti-abuso en formularios públicos (Turnstile + rate limit).
  - Auditoría técnica admin y tareas internas de retención.
- Calidad:
  - Tests unitarios con Vitest.
  - E2E con Playwright (desktop + mobile).
  - CI con quality gate final (`CI Success`).

## Limitaciones conocidas (pendientes de futuras versiones)

- No hay búsqueda semántica de candidatos.
- No hay scoring automático de CV.
- No hay integración con LinkedIn o portales externos.
- No hay multiusuario con roles avanzados.

## Arquitectura y operación (dev / preview / prod)

- `development`:
  - Ejecución local con `npm run dev`.
  - Variables desde `.env`.
- `preview`:
  - Deploys por PR en Vercel.
  - Validación funcional previa a merge.
- `production`:
  - Deploy desde `main` en Vercel.
  - Rollback por redeploy de commit estable.
  - Migraciones Prisma bajo estrategia `expand/contract`.

Referencias operativas:
- [CI-CD](docs/CI-CD.md)
- [Deployment Vercel](docs/DEPLOYMENT-VERCEL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security Hardening](docs/SECURITY-HARDENING.md)

## Stack técnico

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS v4
- Prisma + PostgreSQL
- NextAuth
- Vitest + React Testing Library
- Playwright

## Requisitos

- Node.js `>=20.19.0`
- PostgreSQL
- npm

## Setup rápido

```bash
git clone https://github.com/MaxiPerlo15/spa-rrhh.git
cd spa-rrhh
npm ci
cp .env.example .env
```

Configurar `.env` y luego:

```bash
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

## Variables de entorno clave

Mínimas para runtime:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`

Notas de deploy Railway + Neon:
- El runtime valida `DATABASE_URL` al arrancar (`src/instrumentation.ts` -> `src/lib/checkEnv.ts`).
- En producción falla si `DATABASE_URL` apunta a localhost o desactiva SSL explícitamente.
- Si detecta hostname de Neon sin pooler, emite warning porque este proyecto usa `pg.Pool` + `PrismaPg`.
- Healthcheck recomendado para Railway: `GET /api/health` (devuelve `200` solo si app + DB responden, `503` si la DB no está lista).

Optional for the hybrid Spring Boot flow:
- `BACKEND_URL`
- `BACKEND_INTERNAL_API_TOKEN` when `BACKEND_URL` is configured. The repo sends this token on server-to-server vacancy reads and writes, and Spring requires `RRHH_SECURITY_INTERNAL_API_TOKEN` for `/api/v1/vacancies/**` by default.
- Real Railway private networking is an external deployment setting: set `BACKEND_URL` to the private host when Next and Spring run inside the same private network.
- If Next runs outside the Railway private network, Spring still needs authenticated reachability from Next through a URL protected by this token; do not expose it without `RRHH_SECURITY_INTERNAL_API_TOKEN` configured.

Requeridas en producción:
- `NEXTAUTH_URL`
- `UPLOADTHING_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `AUDIT_CRON_SECRET`
- `CV_RETENTION_CRON_SECRET`
- `RESEND_API_KEY`
- `FROM_EMAIL`

Contrato autoritativo:
- [`src/lib/checkEnv.ts`](src/lib/checkEnv.ts)

Ver detalle en:
- [.env.example](.env.example)
- [SECRETS_POLICY.md](SECRETS_POLICY.md)

## Scripts

```bash
# App
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck

# Unit tests / coverage
npm run test:unit
npm run test:coverage

# E2E
npm run test:e2e
npm run test:e2e:matrix
npm run test:e2e:mobile
npm run test:e2e:mobile:chrome
npm run test:e2e:mobile:safari

# Calidad / entorno
npm run env:check
npm run env:check:prod
npm run predeploy:check

# Datos
npm run db:seed
npm run db:reset
npm run db:verify
npm run admin:create -- --email admin2@empresa.com --password "PasswordSegura123!" --name "Admin Dos"

# Mantenimiento
npm run audit:purge
npm run cv:purge
```

## API (resumen)

Rutas principales:

- `GET/POST /api/vacancies`
- `GET/PUT/PATCH/DELETE /api/vacancies/[id]`
- `GET/POST /api/applications`
- `GET /api/applications/export`
- `GET/PATCH/DELETE /api/applications/[id]`
- `GET/POST /api/contacts`
- `GET/PATCH/DELETE /api/contacts/[id]`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET/PATCH /api/admin/settings`
- `GET/POST/DELETE /api/admin/notifications`
- `PATCH/DELETE /api/admin/notifications/[id]`
- `GET /api/admin/audit`
- `POST /api/internal/audit-retention`
- `POST /api/internal/cv-retention`

## Calidad en CI (checks obligatorios)

- `Lint and Build`
- `Unit Tests`
- `Coverage`
- `NPM Audit`
- `API Smoke`
- `E2E Tests`
- `CI Success`

Detalle: [docs/CI-CD.md](docs/CI-CD.md)

## Estado de backlog (Linear)

Pendiente operativo actual:
- `MIS-120`: QA final mobile en dispositivos reales (bloqueado hasta deployment real).

Pendiente de futuras features:
- `MIS-171`: búsqueda semántica de candidatos.
- `MIS-172`: scoring automático de CV.
- `MIS-173`: integración con LinkedIn/portales externos.
- `MIS-174`: multiusuario con roles avanzados.

## Documentación relacionada

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE-SETUP.md](docs/DATABASE-SETUP.md)
- [docs/E2E-TESTING.md](docs/E2E-TESTING.md)
- [docs/QA-MATRIX.md](docs/QA-MATRIX.md)
- [docs/MOBILE-REAL-DEVICE-QA.md](docs/MOBILE-REAL-DEVICE-QA.md)
- [docs/DEPLOYMENT-VERCEL.md](docs/DEPLOYMENT-VERCEL.md)
