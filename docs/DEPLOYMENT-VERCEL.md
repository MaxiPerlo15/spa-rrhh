# Deployment en Vercel (MIS-111)

## Objetivo

Definir un flujo de despliegue estable para `preview` y `production`, con dominio propio, variables segregadas por entorno y rollback operativo.

## Estrategia de entornos

- `development`: local (`npm run dev`) con `.env`.
- `preview`: cada PR genera URL en Vercel.
- `production`: rama `main` despliega al dominio final.

## Configuración base en Vercel

1. Importar el repo en Vercel y seleccionar framework `Next.js`.
2. Production Branch: `main`.
3. Habilitar Preview Deployments para PRs.
4. Definir variables de entorno separadas por entorno (Preview/Production).

## Dominio y DNS

1. Comprar dominio (ej: `tudominio.com`).
2. En Vercel > Project > Domains:
   - agregar `tudominio.com`
   - agregar `www.tudominio.com`
3. Configurar DNS en tu proveedor:
   - `A` para raíz según valor indicado por Vercel
   - `CNAME` para `www` apuntando al target de Vercel
4. Configurar redirección canónica:
   - `www` -> raíz o raíz -> `www` (una sola versión canónica).

## Variables requeridas en Production

Definir estas variables en Vercel (`Environment: Production`):

- `DATABASE_URL`
- `NEXTAUTH_URL` (URL pública final, `https://...`)
- `NEXTAUTH_SECRET`
- `UPLOADTHING_TOKEN`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `AUDIT_CRON_SECRET`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `SENTRY_AUTH_TOKEN` (si usas sourcemaps upload con Sentry)
- `NEXT_PUBLIC_SENTRY_DSN` (si aplica)

Notas:
- `UPSTASH_*` es obligatorio para anti-abuso en producción (sin fallback inseguro).
- Nunca usar `.env` local como fuente de verdad para production.

## Variables recomendadas en Preview

- Misma estructura que production, pero con recursos separados cuando sea posible:
  - base de datos de staging/preview
  - claves de Turnstile/Resend no productivas
  - DSN de Sentry de entorno preview (opcional)

## Checklist pre-release (antes de merge a main)

1. CI checks en verde:
   - `Lint and Build (20.19.0)`
   - `Run Tests (20.19.0)`
   - `E2E Tests (20.19.0)`
2. Validación local mínima:
   - `npm run test:coverage`
   - `npm run build`
   - `npx tsc --noEmit`
   - `npm run lint`
3. PR sin bloqueantes P0/P1 abiertos.
4. Variables de entorno de production verificadas.

## Rollback operativo

En Vercel:
1. Entrar a `Deployments`.
2. Seleccionar último deployment estable.
3. Promoverlo a producción (`Promote to Production`).
4. Confirmar smoke:
   - `/`
   - `/ofertas-laborales`
   - `/admin/signin`
   - APIs críticas (`/api/vacancies`, `/api/auth/csrf`)

Registrar incidente y causa raíz en `docs/INCIDENT-RUNBOOK.md`.

## Post-deploy smoke checklist

1. Login admin OK.
2. CRUD vacantes OK.
3. Formularios públicos OK (postulación/contacto).
4. Emails de reset/password funcionan.
5. Notificaciones y auditoría admin sin errores 500.
6. Sentry sin picos de errores críticos en los primeros minutos.
