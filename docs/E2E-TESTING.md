# Tests End-to-End (E2E) con Playwright

## Descripción

Los tests E2E simulan interacciones reales de usuarios en la aplicación completa, verificando que todos los flujos funcionen correctamente end-to-end.

## Estructura de Tests

```
tests/e2e/
├── auth.spec.ts          # Tests de autenticación admin
├── vacancies.spec.ts     # Tests CRUD de vacantes
├── applications.spec.ts  # Tests de postulación pública
├── qa-matrix.spec.ts     # Smoke transversal desktop + mobile
└── mobile-critical-flows.spec.ts # Flujos críticos mobile (MIS-123)
```

### Cobertura de Tests

#### 1. Autenticación (`auth.spec.ts`)
- ✅ Renderizado de página de login
- ✅ Validación de credenciales inválidas
- ✅ Login exitoso con credenciales correctas
- ✅ Redirección si ya está autenticado
- ✅ Validación de campos requeridos
- ✅ Validación de formato de email

#### 2. CRUD de Vacantes (`vacancies.spec.ts`)
- ✅ Listar vacantes en panel admin
- ✅ Crear nueva vacante
- ✅ Editar vacante existente
- ✅ Cambiar estado (ACTIVE ↔ CLOSED)
- ✅ Eliminar vacante con confirmación
- ✅ Paginación de lista
- ✅ Búsqueda por título

#### 3. Postulaciones (`applications.spec.ts`)
- ✅ Navegación a ofertas laborales
- ✅ Mostrar vacantes activas
- ✅ Filtrar por ubicación
- ✅ Filtrar por jornada
- ✅ Abrir modal de postulación
- ✅ Completar y enviar postulación
- ✅ Validación de campos requeridos
- ✅ Validación de formato de email
- ✅ Mostrar detalles de vacante
- ✅ Cerrar modal

#### 4. Flujos críticos mobile (`mobile-critical-flows.spec.ts`)
- ✅ Login/logout admin en viewport mobile
- ✅ Navegación por módulos (Vacantes, Postulaciones, Contactos, Configuración)
- ✅ Notificaciones del panel en mobile
- ✅ Cobertura mobile de vacantes, postulaciones y contactos (filtros/controles clave)
- ✅ Onboarding mobile: apertura, avance, cierre y retorno

## Ejecutar Tests

### Prerequisitos

```bash
# Instalar dependencias (incluye Playwright)
npm install

# Instalar navegadores
npx playwright install chromium
```

### Ejecución Local

```bash
# Ejecutar todos los tests E2E (headless)
npm run test:e2e

# Ejecutar cobertura crítica mobile (MIS-123)
npm run test:e2e:mobile

# Ejecutar con UI interactiva (recomendado para desarrollo)
npm run test:e2e:ui

# Ejecutar con navegador visible (headed mode)
npm run test:e2e:headed

# Ejecutar en modo debug
npm run test:e2e:debug

# Ver reporte de último test
npm run test:report
```

### Ejecutar tests específicos

```bash
# Solo tests de autenticación
npx playwright test auth

# Solo tests de vacantes
npx playwright test vacancies

# Solo tests de postulaciones
npx playwright test applications

# Un test específico por nombre
npx playwright test -g "debe iniciar sesión exitosamente"
```

## Configuración

### Variables de Entorno

Los tests usan las mismas variables de entorno que la aplicación:

```bash
# .env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Credenciales del admin (para tests de login)
ADMIN_EMAIL="admin@sparrhh.com"
ADMIN_PASSWORD="ChangeMe123!"

# URL base para tests (opcional)
E2E_BASE_URL="http://localhost:3000"
```

### Configuración de Playwright

Ver `playwright.config.ts` para opciones de configuración:

- **Browser**: Chromium (por defecto)
- **Base URL**: `http://localhost:3000`
- **Retries**: 2 en CI, 0 en local
- **Workers**: 1 en CI (secuencial), paralelo en local
- **Timeouts**: Configurables
- **Screenshots**: Solo en fallas
- **Videos**: Solo en fallas
- **Traces**: En primer retry

## CI/CD Integration

Los tests E2E se ejecutan en GitHub Actions:

### Triggers

- **Automático**: En push a `main` o PRs a `main`
- **Condicional**: Si el PR tiene la etiqueta `run-e2e`

### Workflow

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: lint-and-build
  if: github.ref == 'refs/heads/main' || contains(github.event.pull_request.labels.*.name, 'run-e2e')
  
  steps:
    - Checkout
    - Setup Node
    - Install dependencies
    - Generate Prisma Client
    - Install Playwright browsers
    - Run E2E tests
    - Upload test results
```

### Ejecutar E2E en un PR

Agrega la etiqueta `run-e2e` al Pull Request en GitHub.

## Debugging

### Modo UI (Recomendado)

```bash
npm run test:e2e:ui
```

Esto abre una interfaz gráfica donde puedes:
- Ver todos los tests
- Ejecutar tests individuales
- Ver el navegador en acción
- Time travel debugging
- Ver traces y screenshots

### Modo Debug

```bash
npm run test:e2e:debug
```

Pausa la ejecución y permite:
- Inspeccionar el DOM
- Ejecutar comandos en consola
- Stepthrough del test

### Ver Traces

Si un test falla, Playwright genera un trace:

```bash
# Ver trace del último test
npx playwright show-trace test-results/*/trace.zip
```

## Best Practices

### 1. Usar selectores robustos

```typescript
// ✅ Bueno: Por rol y texto
await page.click('button:has-text("Enviar")');

// ✅ Bueno: Por data-testid
await page.click('[data-testid="submit-button"]');

// ❌ Malo: Por clase CSS (puede cambiar)
await page.click('.btn-primary');
```

### 2. Esperar elementos dinámicos

```typescript
// Esperar a que un elemento sea visible
await expect(page.locator('text=Éxito')).toBeVisible();

// Esperar a que desaparezca
await expect(page.locator('.loading')).not.toBeVisible();
```

### 3. Agrupar tests relacionados

```typescript
test.describe('Feature X', () => {
  test.beforeEach(async ({ page }) => {
    // Setup común
  });

  test('caso 1', async ({ page }) => {});
  test('caso 2', async ({ page }) => {});
});
```

### 4. Cleanup después de tests

Los tests que crean datos (vacantes, postulaciones) deben limpiar después:

```typescript
test.afterEach(async ({ page }) => {
  // Eliminar datos creados en el test
});
```

## Troubleshooting

### Tests fallan localmente pero pasan en CI

- Verificar que el servidor esté corriendo (`npm run dev`)
- Verificar variables de entorno en `.env`
- Limpiar caché: `npx playwright cache clear`

### Error: "Timeout waiting for..."

- Aumentar timeout en config
- Verificar que el elemento existe con UI mode
- Usar `page.waitForSelector()` explícito

### Tests flaky (intermitentes)

- Evitar `page.waitForTimeout()` - usar esperas explícitas
- Usar `toBeVisible()` en lugar de `toHaveText()`
- Aumentar `actionTimeout` en config

### Base de datos sucia entre tests

```bash
# Reset DB antes de ejecutar tests
npm run db:reset
npm run test:e2e
```

## Estructura de un Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Nombre del Feature', () => {
  // Setup antes de cada test
  test.beforeEach(async ({ page }) => {
    await page.goto('/ruta');
  });

  test('debe hacer algo específico', async ({ page }) => {
    // Arrange: Preparar estado
    await page.fill('input', 'valor');
    
    // Act: Ejecutar acción
    await page.click('button');
    
    // Assert: Verificar resultado
    await expect(page.locator('.result')).toBeVisible();
  });

  // Cleanup después de cada test
  test.afterEach(async ({ page }) => {
    // Limpiar datos si es necesario
  });
});
```

## Próximos Pasos

- [ ] Agregar tests de gestión de postulaciones (admin)
- [ ] Agregar tests de gestión de contactos (admin)
- [ ] Tests de navegación responsive (mobile)
- [ ] Tests de accesibilidad con axe-core
- [ ] Visual regression testing
- [ ] Performance testing

## Recursos

- [Documentación Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
