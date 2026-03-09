# Deployment en Vercel (MIS-111, MIS-114)

## Objetivo

Definir un flujo de despliegue estable para `preview` y `production`, con dominio propio, variables segregadas por entorno y rollback operativo seguro por commit.

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
   - `Unit Tests (20.19.0)`
   - `Coverage (20.19.0)`
   - `NPM Audit (20.19.0)`
   - `API Smoke (20.19.0)`
   - `E2E Tests (20.19.0)`
   - `CI Success`
2. Validación local mínima:
   - `npm run test:coverage`
   - `npm run build`
   - `npx tsc --noEmit`
   - `npm run lint`
3. PR sin bloqueantes P0/P1 abiertos.
4. Variables de entorno de production verificadas.

## Estrategia de rollback (MIS-114)

Regla principal:

- rollback de aplicación por **redeploy de commit estable previo** en Vercel;
- no hacer rollback destructivo de base de datos;
- migraciones deben ser forward-compatible (`expand/contract`) para que una versión previa siga operando temporalmente.

## Rollback operativo (paso a paso)

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

## Matriz de decisión de rollback

- Error crítico de UI/API tras deploy (sin cambio de datos incompatible):
  - Acción: rollback inmediato por redeploy de commit estable.
- Error por migración no backward-compatible:
  - Acción: hotfix forward urgente.
  - No aplicar rollback destructivo de DB en caliente.
- Degradación parcial no bloqueante:
  - Acción: mantener versión actual + hotfix controlado.
  - Evitar rollback si impacta más que el incidente actual.

## Guía de migraciones Prisma seguras (expand/contract)

Fase Expand (release N):

1. Agregar columnas/tablas nuevas sin borrar ni renombrar lo existente.
2. Mantener lectura/escritura compatible con esquema viejo y nuevo.
3. Deploy de app + `prisma migrate deploy`.

Fase Transition (N -> N+1):

1. Migrar tráfico y escritura hacia el nuevo modelo.
2. Verificar integridad y métricas operativas.

Fase Contract (release posterior):

1. Remover columnas/campos legacy solo cuando ningún runtime activo dependa de ellos.
2. Ejecutar migración de limpieza en ventana controlada.

Patrones a evitar:

- renombrar/borrar columnas en el mismo release donde cambias código consumidor;
- cambios que exijan rollback de DB para volver a una versión previa de app.

## Simulacro de rollback en entorno no productivo

Objetivo: validar que el procedimiento funciona antes de usarlo en incidente real.

1. Deploy en `preview` un commit de referencia.
2. Deploy en `preview` un commit con fallo controlado (feature-flag o error conocido reversible).
3. Ejecutar rollback por redeploy del commit estable.
4. Correr smoke checklist:
   - landing, ofertas, signin,
   - APIs críticas (`/api/vacancies`, `/api/auth/csrf`),
   - login admin.
5. Registrar evidencia:
   - URL preview antes/después,
   - commit restaurado,
   - hora de inicio/recuperación,
   - resultado del smoke.

Frecuencia recomendada:

- mínimo una vez por sprint o antes de releases de alto riesgo.

## Post-deploy smoke checklist

1. Login admin OK.
2. CRUD vacantes OK.
3. Formularios públicos OK (postulación/contacto).
4. Emails de reset/password funcionan.
5. Notificaciones y auditoría admin sin errores 500.
6. Sentry sin picos de errores críticos en los primeros minutos.
