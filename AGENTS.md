# AGENTS.md

## Snapshot
- Single-package Next.js 16 App Router app on npm (`package-lock.json` present, no monorepo tooling).
- Node must satisfy `>=20.19.0`.
- There is a secondary `backend/` Spring Boot project, but the main runtime in this repo is the Next app.

## Bootstrap and command order
- Local bootstrap order is important: `npm ci` -> `npx prisma migrate dev` -> `npx prisma generate` -> `npm run db:seed` -> `npm run dev`.
- CI uses a slightly different DB flow: `npm ci` -> `npx prisma migrate deploy` -> `npx prisma generate` -> job-specific checks.
- `npm run start` serves the production app on port `3001`, not `3000`.

## High-value commands
- App: `npm run dev`, `npm run build`, `npm run start`
- Static checks: `npm run lint`, `npm run typecheck`
- Unit tests: `npm run test:unit`
- Coverage gate: `npm run test:coverage` (Vitest thresholds are enforced here)
- Fast API smoke: `npx playwright test tests/e2e/api-smoke.spec.ts`
- Cross-platform smoke: `npm run test:e2e:matrix`
- Mobile critical flows: `npm run test:e2e:mobile`
- Production-style env validation: `npm run env:check:prod`
- Predeploy bundle: `npm run predeploy:check`
- DB/admin utilities: `npm run db:seed`, `npm run db:reset`, `npm run db:verify`, `npm run admin:create -- --email ... --password ... --name ...`

## Test and Playwright quirks
- `npm run test` and `npm run test:e2e` both run Playwright, not Vitest.
- Default Playwright config starts its own Next dev server on `http://127.0.0.1:3100`.
- `npm run test:e2e:local` uses `playwright.local.config.ts` and expects an already running app on `http://127.0.0.1:3001`.
- Vitest default environment is `node`; browser-style tests opt into jsdom per file with `// @vitest-environment jsdom`.
- API smoke expectations are repo-specific: `/api/vacancies` and `/api/auth/csrf` must return `200`, while unauthenticated `/api/admin/notifications` must return `401` or `403`.
- Some authenticated QA-matrix coverage is conditional on `ADMIN_EMAIL` and `ADMIN_PASSWORD` being present.

## Where the real wiring lives
- App entrypoints: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/home-client.tsx`, `src/app/admin/page.tsx`.
- API routes live under `src/app/api`.
- Runtime env validation happens at startup through `src/instrumentation.ts` -> `src/lib/checkEnv.ts`; broken env can fail startup/build-like flows.
- Request-level auth/CSP/CORS logic is centralized in `src/proxy.ts`.
- Shared DB access is centralized in `src/lib/prisma.ts`; it uses `pg.Pool` + `PrismaPg`. Do not introduce extra Prisma clients casually.
- This codebase has a real layered split beyond `src/app`: prefer `src/application`, `src/domain`, and `src/infrastructure` for business logic before adding more logic to React components/hooks.

## Hybrid Spring backend behavior
- Vacancy reads/writes can proxy to Spring when `BACKEND_URL` is set.
- In production, `BACKEND_URL` also requires `BACKEND_INTERNAL_API_TOKEN`; dev may only warn, but protected Spring routes will reject missing tokens.
- Dev-only fallback from Spring vacancy reads back to Prisma exists only when `ALLOW_PRISMA_FALLBACK_ON_BACKEND_READ_ERROR=true`.
- The Spring backend header contract is implemented in `src/lib/server/springBackend.ts` (`X-Backend-Api-Key`).

## Environment and operational gotchas
- `DATABASE_URL` and `NEXTAUTH_SECRET` are hard runtime requirements.
- Production env validation also requires `NEXTAUTH_URL`, UploadThing, Turnstile, Upstash, audit/retention cron secrets, Resend, and `FROM_EMAIL`.
- Production rejects `DATABASE_URL` or `BACKEND_URL` pointing to localhost.
- With the current `pg.Pool` + `PrismaPg` setup, Neon pooled connection strings are preferred; non-pooler Neon hosts trigger warnings.
- Healthcheck is DB-backed: `GET /api/health` returns `200` only when the DB responds, otherwise `503`.

## CI / merge expectations
- The real merge gate is the `CI Success` job in `.github/workflows/ci.yml`.
- Required green jobs are: `Lint and Build`, `Unit Tests`, `Coverage`, `NPM Audit`, `API Smoke`, `E2E Tests`, and `CI Success`.
- CI currently does **not** run a standalone `npm run typecheck` step even though some docs recommend it locally.

## Docs to distrust first
- Watch for port drift in docs/tests: current repo uses `3001` for `npm run start`, `3100` for default Playwright webServer, and some older docs still mention `3000`.
- `docs/ARCHITECTURE.md` contains useful history but does not fully reflect the current `src/application` / `src/domain` / `src/infrastructure` split.
