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
   - ✅ Ejecuta tests unitarios (`npm run test:unit`)
   - ✅ Sube resultados de tests

3. **Job: e2e** (solo en main o con label "run-e2e")
   - ✅ Ejecuta tests E2E (`npm run test:e2e`)
   - ✅ Sube resultados

4. **Job: ci-success**
   - ✅ Confirma que todo pasó correctamente

## Triggers

El pipeline se ejecuta en:
- Push a `main`
- Push a ramas `feature/*` y `release/*`
- Pull Requests hacia `main`

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
- Es normal: solo corren en `main` por defecto
- Para ejecutarlos en un PR específico, añade el label `run-e2e` al PR
