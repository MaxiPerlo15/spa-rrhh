# Configuración CI/CD

## GitHub Actions - Secrets Requeridos

Para que el pipeline CI funcione correctamente, debes configurar los siguientes secrets en tu repositorio de GitHub:

**Ruta:** Settings → Secrets and variables → Actions → New repository secret

### Secrets necesarios:

1. **DATABASE_URL**
   - Descripción: URL de conexión a PostgreSQL para el build
   - Formato: `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`
   - Ejemplo: `postgresql://postgres:mypassword@localhost:5432/spa_rrhh_ci?schema=public`
   - Nota: Puedes usar una base de datos de prueba/staging para CI

2. **NEXTAUTH_URL**
   - Descripción: URL base de la aplicación
   - Formato: `http://localhost:3000` o `https://tudominio.com`
   - Para CI: `http://localhost:3000`

3. **NEXTAUTH_SECRET**
   - Descripción: Secret key para NextAuth (JWT)
   - Generar con: `openssl rand -base64 32`
   - Ejemplo: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg1234567890=`

### Secrets opcionales (para futuras implementaciones):

4. **EMAIL_API_KEY** (v0.2.1 - notificaciones)
   - Para Resend, SendGrid u otro proveedor de email

5. **S3_BUCKET**, **S3_KEY**, **S3_SECRET**, **S3_REGION** (v0.2.1 - storage)
   - Para almacenamiento seguro de CVs

6. **SENTRY_DSN** (v0.2.1 - observabilidad)
   - Para monitoreo de errores

## Cómo agregar secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret**
4. Nombre: Escribe el nombre exacto del secret (ej: `DATABASE_URL`)
5. Secret: Pega el valor
6. Click en **Add secret**

## Pipeline CI - Qué hace

El archivo `.github/workflows/ci.yml` ejecuta automáticamente:

### En cada push o Pull Request:

1. **Job: lint-and-build**
   - ✅ Checkout del código
   - ✅ Instala Node.js 20.x
   - ✅ Cache de npm (acelera builds)
   - ✅ Instala dependencias (`npm ci`)
   - ✅ Ejecuta linter (`npm run lint`)
   - ✅ Compila el proyecto (`npm run build`)
   - ✅ Sube artefactos de build

2. **Job: unit-tests**
   - ✅ Ejecuta tests unitarios (`npm run test:unit`)

3. **Job: coverage**
   - ✅ Ejecuta tests con cobertura (`npm run test:coverage`)
   - ✅ Valida umbrales mínimos de cobertura definidos en `vitest.config.ts`
   - ✅ Sube artefactos de cobertura

4. **Job: api-smoke**
   - ✅ Ejecuta smoke tests de APIs críticas

5. **Job: npm-audit**
   - ✅ Ejecuta `npm audit --audit-level=high`
   - ✅ Falla si detecta vulnerabilidades `high` o `critical`

6. **Job: e2e-tests** (siempre en PR a `main` y en pushes a `main`)
   - ✅ Ejecuta tests E2E (`npm run test:e2e`)
   - ✅ Sube resultados

7. **Job: ci-success**
   - ✅ Resume el estado final real de todos los checks obligatorios del pipeline
   - ✅ Debe quedar verde antes de mergear manualmente a `main`

## Triggers

El pipeline se ejecuta en:
- Push a `main`
- Push a ramas `feature/*` y `release/*`
- Pull Requests hacia `main`

## Semáforo manual de merge

Este repositorio es privado y hoy tiene un único desarrollador iterando. No se usa `branch protection` como mecanismo principal.
El control compensatorio es operativo: no mergear a `main` si `CI Success` no está verde.

- `Lint and Build`
- `Unit Tests`
- `Coverage`
- `NPM Audit`
- `API Smoke`
- `E2E Tests`
- `CI Success`

## Deployment strategy (Vercel)

La estrategia operativa de despliegue, dominio y rollback está documentada en:

- `docs/DEPLOYMENT-VERCEL.md`

## Governance operativa para repo privado

1. Todo cambio entra por PR hacia `main` (sin push directo).
2. No se hace merge si no están verdes:
   - `Lint and Build`
   - `Unit Tests`
   - `Coverage`
   - `NPM Audit`
   - `API Smoke`
   - `E2E Tests`
   - `CI Success`
3. `CI Success` es el semáforo final: si está rojo o ausente por fallo aguas arriba, no se mergea.
4. Toda excepción debe quedar documentada en el PR (motivo + plan de remediación).

### Checklist mínimo de merge (control compensatorio)

- PR abierto contra `main`.
- Descripción con alcance y riesgos.
- Checks CI verdes.
- Sin conflictos con `main`.
- Evidencia de pruebas para cambios críticos (capturas/logs/comentarios).

## CI hardening (migraciones + smoke API)

El workflow incluye hardening para hacer la pipeline más determinista:

1. Ejecuta `prisma migrate deploy` en jobs de `lint-and-build`, `unit-tests`, `coverage`, `api-smoke` y `e2e-tests`.
2. Ejecuta smoke tests de APIs críticas en CI:
   - `GET /api/vacancies`
   - `GET /api/auth/csrf`
   - `GET /api/admin/notifications` (debe rechazar sin sesión)
3. Ejecuta auditoría de vulnerabilidades npm:
   - `npm audit --audit-level=high`
   - Bloquea CI ante findings `high` o `critical`

## Política de dependencias (MIS-115)

La política operativa de dependencias está documentada en:

- `docs/DEPENDENCY-POLICY.md`

## Ver resultados

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow "CI Pipeline"
3. Revisa los logs de cada job

## Badges (opcional)

Puedes agregar un badge al README:

```markdown
![CI](https://github.com/MaxiPerlo15/spa-rrhh/actions/workflows/ci.yml/badge.svg)
```

## Troubleshooting

### Error: "DATABASE_URL secret not found"
- Verifica que el secret esté configurado en GitHub
- El nombre debe ser exactamente `DATABASE_URL` (case-sensitive)

### Error en build: "Missing environment variable"
- Asegúrate de pasar todas las env vars necesarias en el step de build

### E2E tests no se ejecutan en PR
- Verifica que el PR apunte a `main`
- Revisa el `if` del job `e2e-tests` en `.github/workflows/ci.yml`
