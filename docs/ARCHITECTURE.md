# Arquitectura del Proyecto - Meinardi&Perlo RRHH

## Visión General

Este proyecto es una aplicación Next.js 16 con TypeScript que implementa un sistema de gestión de recursos humanos. Está estructurado siguiendo principios de modularidad, reutilización de código y separación de responsabilidades.

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS v4
- **Testing**: Playwright (E2E)
- **CI/CD**: GitHub Actions

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
│   └── middleware.ts        # Middleware de Next.js
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

---

**Última actualización**: Diciembre 2025
**Versión**: 0.2.1
