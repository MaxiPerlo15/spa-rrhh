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

2. **Job: test**
   - ✅ Ejecuta tests unitarios con cobertura (`npm run test:coverage`)
   - ✅ Valida umbrales mínimos de cobertura definidos en `vitest.config.ts`
   - ✅ Sube resultados de tests

3. **Job: e2e** (siempre en PR a `main` y en pushes a `main`)
   - ✅ Ejecuta tests E2E (`npm run test:e2e`)
   - ✅ Sube resultados

4. **Job: ci-success**
   - ✅ Confirma que todo pasó correctamente

## Triggers

El pipeline se ejecuta en:
- Push a `main`
- Push a ramas `feature/*` y `release/*`
- Pull Requests hacia `main`

## Required Checks (Branch Protection)

Para bloquear merges con señal incompleta, configura protección de `main` con checks granulares obligatorios:

- `Lint and Build`
- `Run Tests`
- `E2E Tests`

Opcional:
- `CI Success` (solo como check resumen visual)

### Checklist de configuración en GitHub

1. Ve a **Settings** → **Branches**.
2. Edita o crea la regla de protección para `main`.
3. Activa **Require status checks to pass before merging**.
4. Selecciona como required checks:
   - `Lint and Build`
   - `Run Tests`
   - `E2E Tests`
5. (Opcional) añade `CI Success`.
6. Guarda la regla.

## Deployment strategy (Vercel)

La estrategia operativa de despliegue, dominio y rollback está documentada en:

- `docs/DEPLOYMENT-VERCEL.md`

## Governance en repo privado sin enforcement efectivo

Actualmente, GitHub muestra que la ruleset puede no aplicar enforcement real en este repositorio privado según plan.
Para mitigar ese riesgo se define la siguiente política operativa obligatoria:

1. Todo cambio entra por PR hacia `main` (sin push directo).
2. No se hace merge si no están verdes:
   - `Lint and Build`
   - `Run Tests`
   - `E2E Tests`
3. Si `CI Success` está configurado, también debe quedar en verde.
4. Toda excepción debe quedar documentada en el PR (motivo + plan de remediación).

### Checklist mínimo de merge (control compensatorio)

- PR abierto contra `main`.
- Descripción con alcance y riesgos.
- Checks CI verdes.
- Sin conflictos con `main`.
- Evidencia de pruebas para cambios críticos (capturas/logs/comentarios).

## CI hardening (migraciones + smoke API)

El workflow incluye hardening para hacer la pipeline más determinista:

1. Ejecuta `prisma migrate deploy` en jobs de `lint-and-build`, `test` y `e2e`.
2. Ejecuta smoke tests de APIs críticas en CI:
   - `GET /api/vacancies`
   - `GET /api/auth/csrf`
   - `GET /api/admin/notifications` (debe rechazar sin sesión)

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
- Revisa el `if` del job `e2e` en `.github/workflows/ci.yml`
