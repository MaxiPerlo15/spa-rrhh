# Arquitectura del Proyecto - Meinardi&Perlo RRHH

## Visión General

Este proyecto es una aplicación Next.js 16 con TypeScript que implementa un sistema de gestión de recursos humanos. Está estructurado siguiendo principios de modularidad, reutilización de código y separación de responsabilidades.

Documentación operativa relacionada:
- `docs/SECURITY-HARDENING.md`
- `docs/INCIDENT-RUNBOOK.md`
- `docs/RUNTIME-HYGIENE.md`
- `docs/COOKIE-STRATEGY.md`
- `docs/ADMIN-ONBOARDING.md`

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS v4
- **Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
- **CI/CD**: GitHub Actions

Configuración de tests unitarios:

- `vitest.config.ts` usa entorno `node` por defecto para tests de servicios/utilidades.
- Tests de hooks/componentes se ejecutan en `jsdom` con anotación por archivo (`@vitest-environment jsdom`).

## Estructura de Carpetas

```
spa-rrhh/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Panel administrativo
│   │   ├── api/               # API Routes
│   │   ├── ofertas-laborales/ # Página de vacantes públicas
│   │   ├── layout.tsx         # Layout principal
│   │   └── page.tsx           # Página de inicio
│   │
│   ├── components/            # Componentes React reutilizables
│   │   ├── admin/            # Componentes específicos del admin
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminTabs.tsx
│   │   │   └── DashboardStats.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   │
│   ├── contexts/             # React Contexts
│   │   ├── AuthProvider.tsx
│   │   └── ToastContext.tsx
│   │
│   ├── hooks/                # Custom React Hooks
│   │   ├── useAdminDashboard.ts
│   │   └── useScrollAnimation.ts
│   │
│   ├── lib/                  # Utilidades y configuraciones
│   │   ├── api/             # Capa de servicios API
│   │   │   ├── vacancies.ts
│   │   │   ├── applications.ts
│   │   │   ├── contacts.ts
│   │   │   └── index.ts
│   │   ├── auth.ts          # Configuración NextAuth
│   │   └── prisma.ts        # Cliente Prisma
│   │
│   ├── types/               # Definiciones de tipos TypeScript
│   ├── data/                # Datos estáticos y constantes
│   └── proxy.ts             # Proxy (anteriormente middleware) de Next.js
│
├── prisma/                  # Esquema y migraciones
│   ├── schema.prisma
│   └── seed.ts
│
├── tests/                   # Tests E2E
│   └── e2e/
│       ├── auth.spec.ts
│       ├── vacancies.spec.ts
│       └── applications.spec.ts
│
├── docs/                    # Documentación
│   ├── ARCHITECTURE.md
│   ├── DATABASE-SETUP.md
│   └── E2E-TESTING.md
│
└── public/                  # Archivos estáticos

```

## Capas de la Aplicación

### 1. Capa de Presentación (`src/app` y `src/components`)

**Responsabilidad**: Renderizado de UI y manejo de interacciones del usuario.

- **Pages**: Componentes de página en `src/app` que definen rutas
- **Components**: Componentes reutilizables organizados por funcionalidad
  - Componentes generales en `src/components/`
  - Componentes específicos de admin en `src/components/admin/`

**Convenciones**:
- Usar `'use client'` solo cuando sea necesario (interactividad, hooks)
- Mantener componentes pequeños y enfocados (máx 200-300 líneas)
- Extraer lógica compleja a custom hooks

**Estándar de diálogos (admin)**:
- Confirmaciones críticas (eliminar/cerrar sesión) deben pasar por `src/components/ConfirmDialog.tsx`.
- Los modales de detalle/edición deben cerrar con `Esc`, clic de backdrop o botón explícito.
- Mantener consistencia visual entre modales: `rounded-2xl`, borde sutil y `backdrop-blur`.
- Onboarding inicial de admin en `src/components/admin/AdminOnboardingDialog.tsx` con persistencia local y reentrada desde botón de ayuda.

**Estándar responsive (MIS-79)**:
- En mobile, priorizar `flex-col`/`grid-cols-1` y escalar a `sm/md/lg` progresivamente.
- Tablas del admin deben ser utilizables en pantallas chicas: `overflow-x-auto` + ocultar columnas secundarias por breakpoint.
- Acciones críticas y CTAs deben mantener objetivos táctiles cómodos (`w-full` en mobile cuando aplica).

**Navegación hash estable (MIS-86)**:
- Navegación a secciones con offset fijo centralizada en `src/lib/hashScroll.ts`.
- Usar `scrollToHashWithOffset` desde `NavBar`, `Footer`, `Hero` y carga inicial de home.

**Feedback de UI con toasts (MIS-85)**:
- Proveedor global en `src/contexts/ToastContext.tsx`.
- Posicionamiento estándar: bottom-center.
- Usar toasts para confirmaciones de éxito/error en flujos principales de formularios, auth admin y acciones CRUD del panel.

**Hardening UX de acciones críticas (MIS-104)**:
- Acciones destructivas y sensibles del panel usan `ConfirmDialog` con estado de carga (`isLoading`) para evitar dobles ejecuciones.
- Acciones por fila (eliminar/cerrar/activar) bloquean solo la fila afectada con feedback inmediato (`Procesando...` / `Eliminando...`).
- Acciones masivas de notificaciones (`marcar todas leídas` / `limpiar leídas`) muestran estado de progreso y, en borrado, confirmación explícita previa.
- Flujos críticos muestran resultado explícito (toast de éxito/error) y fallback de recarga cuando una operación falla.

**Timeline de auditoría operativa (MIS-107)**:
- Endpoint dedicado para trazabilidad admin: `GET /api/admin/audit`.
- Filtros soportados: `actorEmail`, `action`, `resourceType`, `dateFrom`, `dateTo`.
- Vista integrada en `Configuración` con tabla cronológica, estados de resultado (`SUCCESS`, `DENIED`, `ERROR`) y paginación.
- La UI permite investigar acciones críticas sin depender de logs técnicos externos.

**Tutoriales adaptativos por estado de datos (MIS-110)**:
- La secuencia de tutorial por módulo se ajusta dinámicamente según datos disponibles en tabla.
- Si no existen registros (`vacantes`, `postulaciones`, `contactos`), se omiten pasos irrelevantes (ver/editar/detalle) y se reemplazan por guía contextual.
- Se preserva el enfoque no bloqueante: onboarding y tutorial orientan acciones sin forzar ejecución operativa.

**Cobertura E2E crítica ampliada (MIS-116)**:
- Matriz E2E reforzada en `tests/e2e/qa-matrix.spec.ts` con smoke multiplataforma (desktop + mobile) sobre:
  - landing/home y secciones core,
  - ofertas laborales y formularios públicos,
  - rutas de auth admin (`signin`, `forgot`, `reset`),
  - validación de navegación/hash y refresh.
- Flujos autenticados quedan cubiertos de forma condicional por credenciales de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) para mantener estabilidad CI cuando no están configuradas.

### 2. Capa de Lógica de Negocio (`src/hooks`)

**Responsabilidad**: Encapsular lógica de estado y efectos secundarios.

**Ejemplos**:
- `useAdminDashboard`: Maneja todo el estado y operaciones del dashboard
- `useScrollAnimation`: Lógica reutilizable para animaciones de scroll

**Convenciones**:
- Prefijo `use` para todos los hooks
- Retornar objeto con propiedades descriptivas
- Incluir JSDoc para documentación

### 3. Capa de Servicios API (`src/lib/api`)

**Responsabilidad**: Centralizar todas las llamadas a APIs externas o internas.

**Estructura**:
```typescript
// src/lib/api/vacancies.ts
export async function getVacancies(): Promise<Vacancy[]>
export async function createVacancy(data: CreateVacancyData): Promise<Vacancy>
export async function updateVacancy(id: string, data: UpdateVacancyData): Promise<Vacancy>
export async function deleteVacancy(id: string): Promise<void>
```

**Beneficios**:
- ✅ Centralización: Un solo lugar para modificar endpoints
- ✅ Reutilización: Misma función usada en múltiples componentes
- ✅ Testing: Fácil de mockear en tests
- ✅ Type Safety: Tipos compartidos entre cliente y servidor

**Convenciones**:
- Un archivo por dominio (vacancies, applications, contacts)
- Funciones async que retornan Promises tipadas
- Manejo de errores consistente con throw Error
- Export de tipos e interfaces

### 4. Capa de Datos (`src/lib/prisma.ts` y `prisma/`)

**Responsabilidad**: Acceso y manipulación de base de datos.

- **Prisma Client**: Singleton en `src/lib/prisma.ts`
- **Schema**: Definición de modelos en `prisma/schema.prisma`
- **Seeds**: Datos iniciales en `prisma/seed.ts`

Regla operativa:

- Toda lectura/escritura en runtime (API routes, auth, servicios de servidor) debe usar exclusivamente `src/lib/prisma.ts`.
- No crear `PrismaClient` adicional en otros módulos para evitar pools duplicados.
- `DATABASE_URL` es obligatoria en runtime (sin fallback hardcodeado).

### 5. Capa de API Routes (`src/app/api`)

**Responsabilidad**: Endpoints HTTP que conectan frontend con base de datos.

**Estructura**:
```
src/app/api/
├── vacancies/
│   ├── route.ts           # GET, POST
│   └── [id]/
│       └── route.ts       # GET, PATCH, DELETE
├── applications/
└── contacts/
```

**Convenciones**:
- Validación de datos de entrada
- Manejo de errores con try-catch
- Respuestas consistentes (JSON)
- Status codes apropiados (200, 201, 400, 404, 500)

## Flujo de Datos

### Ejemplo: Crear una Vacante

```
┌─────────────┐
│ Componente  │  1. Usuario llena formulario
│  (UI)       │  2. Llama onClick handler
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Hook      │  3. useAdminDashboard.createVacancy()
│  (Lógica)   │  4. Valida datos localmente
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Service│  5. api/vacancies.createVacancy(data)
│  (Fetching) │  6. POST /api/vacancies
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Route   │  7. Valida en servidor
│  (Backend)  │  8. Prisma.vacancy.create()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │  9. INSERT INTO vacancies
│ (PostgreSQL)│  10. Retorna registro creado
└─────────────┘
```

## Matriz de Autorización de API

Para evitar exposición de datos sensibles, las rutas deben aplicar autorización en servidor:

- `GET /api/vacancies`: público (solo vacantes `ACTIVE`).
- `GET /api/vacancies?all=1`: solo `ADMIN`.
- `GET /api/vacancies/[id]`: público para datos de vacante, con `applications` solo para `ADMIN`.
- `POST /api/vacancies`: solo `ADMIN`.
- `GET /api/applications`: solo `ADMIN`.
- `GET /api/applications/[id]`: solo `ADMIN`.
- `PATCH/DELETE /api/applications/[id]`: solo `ADMIN`.
- `GET /api/contacts`: solo `ADMIN`.
- `GET /api/contacts/[id]`: solo `ADMIN`.
- `PATCH/DELETE /api/contacts/[id]`: solo `ADMIN`.

Este criterio evita IDOR y asegura principio de mínimo privilegio en el panel administrativo.

Nota de implementación:

- El panel admin consume `GET /api/vacancies?all=1` para gestionar el ciclo completo (`active`, `closed`, `draft`).
- El flujo de edición en admin debe precargar campos opcionales (`salary`, `requirements`, `benefits`) para evitar sobrescrituras accidentales.

## Modelo de acceso admin (single-admin)

- El panel está diseñado para una cuenta administrativa operativa única.
- No se implementa jerarquía `OWNER/ADMIN/VIEWER`; el permiso efectivo para panel/API privada es `ADMIN`.
- Si se configura `ADMIN_EMAIL`, la autenticación en panel solo acepta ese email (guardrail adicional).
- Todas las acciones críticas del panel deben mantener confirmación explícita + estado de carga visible + feedback de resultado.

## Estándar de Validación (Zod)

Las rutas API usan validación runtime centralizada en:

- `src/lib/apiValidation.ts`

Reglas actuales:

- Validación de `params` (IDs), `query` y `body` con Zod.
- Normalización de strings opcionales (ejemplo: `""` -> `undefined` cuando aplica).
- Validación de enums para estados y catálogos (`workday`, `modality`, `status`).
- Respuesta uniforme para input inválido con HTTP `400`.

Formato de error de validación:

```json
{
  "error": "Datos inválidos",
  "details": [
    {
      "field": "status",
      "message": "Invalid enum value"
    }
  ]
}
```

## Contratos de Respuesta (DTO)

Para reducir divergencias entre endpoints, los contratos de salida se centralizan en DTOs:

- `src/lib/dto/vacancy.ts`

Regla actual para vacantes:

- Todas las respuestas de `/api/vacancies` y `/api/vacancies/[id]` exponen `status` en minúsculas (`active`, `closed`, `draft`).
- Fechas serializadas en ISO string.
- Campos opcionales normalizados a `undefined` cuando no tienen valor.

## Protección Anti-Abuso (Formularios Públicos)

Los endpoints públicos `POST /api/contacts` y `POST /api/applications` aplican dos capas:

- Rate limiting por IP en memoria (ventana de 10 minutos).
- Verificación de bot con Cloudflare Turnstile en servidor.

Variables de entorno:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Comportamiento:

- Si se supera el límite, la API responde `429`.
- Si falla captcha, la API responde `400`.
- Se registran eventos bloqueados con `logger.warn` para observabilidad.

## Contrato de Entorno

La validación de entorno vive en `src/lib/checkEnv.ts` y se ejecuta al iniciar runtime Node desde `src/instrumentation.ts`.

Reglas de validación:

- Requeridas siempre: `DATABASE_URL`, `NEXTAUTH_SECRET`.
- Requeridas en producción: `NEXTAUTH_URL`, `UPLOADTHING_TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
- Reglas condicionales: si existe `RESEND_API_KEY`, también debe existir `FROM_EMAIL`.

Este esquema permite fail-fast en producción sin bloquear flujos de desarrollo con integraciones opcionales.

## Patrones de Diseño Implementados

### 1. **Repository Pattern** (Capa de API Services)

Abstrae el acceso a datos detrás de una interfaz limpia.

```typescript
// ❌ Antes: fetch directo en componentes
const res = await fetch('/api/vacancies')
const data = await res.json()

// ✅ Ahora: servicio centralizado
const vacancies = await getVacancies()
```

### 2. **Custom Hooks Pattern**

Encapsula lógica compleja y reutilizable.

```typescript
// ✅ Reutilizable en múltiples componentes
const { vacancies, createVacancy, isLoading } = useAdminDashboard()
```

### 3. **Composition Pattern**

Componentes pequeños que se componen para formar vistas complejas.

```typescript
<AdminDashboard>
  <AdminHeader />
  <AdminTabs />
  <DashboardStats />
  <VacanciesTab />
</AdminDashboard>
```

### 4. **Provider Pattern** (React Context)

Estado global accesible desde cualquier componente.

```typescript
// En layout.tsx
<ToastProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</ToastProvider>

// En cualquier componente
const { showSuccess } = useToast()
```

## Mejores Prácticas

### Nombrado de Archivos

- **Componentes**: PascalCase (`VacancyCard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useAdminDashboard.ts`)
- **Utilidades**: camelCase (`formatDate.ts`)
- **Tipos**: PascalCase (`types/Vacancy.ts`)

### Organización de Imports

```typescript
// 1. Externos (React, Next.js, libraries)
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Internos (servicios, hooks, componentes)
import { getVacancies } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'

// 3. Tipos
import type { Vacancy } from '@/lib/api/vacancies'
```

### TypeScript

- Usar tipos explícitos en props y retornos de funciones
- Evitar `any`, preferir `unknown` si es necesario
- Crear interfaces reutilizables en `src/types` o co-localizadas
- Usar tipos de Prisma cuando sea posible

### Manejo de Errores

```typescript
try {
  const data = await apiCall()
  showSuccess('Operación exitosa')
} catch (error) {
  console.error('Error detallado:', error)
  showError(error instanceof Error ? error.message : 'Error genérico')
}
```

## Testing

### E2E Tests (Playwright)

Ubicación: `tests/e2e/`

**Cobertura**:
- ✅ Flujos de autenticación
- ✅ CRUD de vacantes (admin)
- ✅ Proceso de postulación (público)

**Comando**: `npm run test:e2e`

### Unit Tests (Futuros)

**Prioridades**:
1. Funciones de utilidad
2. Custom hooks (con React Testing Library)
3. Servicios de API (con MSW)

## Seguridad

- ✅ Autenticación con NextAuth.js
- ✅ Variables de entorno para secrets
- ✅ Validación en cliente y servidor
- ✅ Sanitización de inputs
- 🔄 CSRF protection (Next.js built-in)
- 🔄 Rate limiting (pendiente)

## Performance

- ✅ Server Components por defecto
- ✅ Client Components solo cuando necesario
- ✅ Lazy loading de imágenes
- ✅ Código dividido automáticamente (Next.js)
- ✅ Virtualización incremental por lotes en tablas admin cuando el tamaño de página es alto (`>=50` filas)
- ✅ Selector global de filas por página (10/25/50/100/200) con persistencia en `localStorage`
- ✅ Memoización selectiva de métricas de estado en módulos de Postulaciones y Contactos
- 🔄 ISR para páginas públicas (pendiente)
- 🔄 API caching (pendiente)

## Roadmap de Arquitectura

### v0.3.0 - Servicios y Optimizaciones
- [ ] Implementar servicio de emails (Resend/SendGrid)
- [ ] Servicio de storage para CVs (S3/Cloudinary)
- [ ] Implementar caché con Redis
- [ ] Monitoring con Sentry

### v0.4.0 - Testing y Calidad
- [ ] Unit tests para hooks y utilidades
- [ ] Integration tests para API routes
- [ ] Visual regression tests
- [ ] Performance budgets

### v0.5.0 - Escalabilidad
- [ ] Implementar rate limiting
- [ ] CDN para assets estáticos
- [ ] Database read replicas
- [ ] Background jobs (Bull/BullMQ)

## Guía para Nuevos Desarrolladores

### Agregar una Nueva Funcionalidad

1. **Definir tipos** en `src/lib/api/[domain].ts`
2. **Crear servicios API** con funciones CRUD
3. **Crear custom hook** si hay lógica compleja
4. **Crear componentes UI** en `src/components/`
5. **Integrar en página** en `src/app/`
6. **Agregar tests E2E** en `tests/e2e/`

### Debugging

1. **Client-side**: Chrome DevTools, React DevTools
2. **Server-side**: `console.log` en API routes, Prisma Studio
3. **Database**: `npx prisma studio`
4. **API**: Thunder Client, Postman, o `curl`

### Despliegue

- **Desarrollo**: `npm run dev`
- **Build**: `npm run build`
- **Producción**: Vercel (recomendado) o Docker

## Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright](https://playwright.dev/docs/intro)

## Actualización Sprint 2 (Febrero 2026)

- Se agregó `GET/PATCH /api/admin/settings` para configuración operativa de cuenta en el panel admin.
- `AdminNotification` ahora soporta acción contextual (`label`, `type`, `resourceId`) para deep-links.
- El inbox del header permite CTA directa hacia vacantes/postulaciones/contactos.
- Las tablas de admin incorporan filtros combinables + ordenamiento + persistencia de estado en `localStorage`.
- Se añadió el modelo `AdminSettings` para persistir preferencias de notificaciones.

---

**Última actualización**: Febrero 2026
**Versión**: 0.2.1
