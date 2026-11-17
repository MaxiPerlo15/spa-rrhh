# Guía del proyecto

**spa-rrhh está en desarrollo y todavía no tiene un despliegue en producción.**

La plataforma está orientada a Meinardi & Perlo RRHH, consultora de Las Varillas, Córdoba. Su propósito es acercar oportunidades laborales a candidatos y facilitar el contacto de empresas con la consultora.

## Objetivos

1. Presentar la identidad y la propuesta de la consultora.
2. Reunir oportunidades laborales en un portal propio.
3. Vincular cada postulación con la vacante que la origina.
4. Ofrecer un canal de consultas para empresas y visitantes.
5. Evolucionar hacia la administración interna del proceso de selección.

## Estado del repositorio

| Rama | Qué representa |
| --- | --- |
| [`main`](https://github.com/MaxiPerlo15/spa-rrhh/tree/main) | Base inicial del portal público y API con Next.js, Prisma y PostgreSQL. |
| [`develop`](https://github.com/MaxiPerlo15/spa-rrhh/tree/develop) | Evolución del producto, administración, autenticación y trabajo de migración hacia Spring Boot. |

El estado general sigue siendo **en desarrollo**. La base inicial necesita completar y validar protección de endpoints y manejo de datos personales antes de utilizarse con candidatos reales.

## Recorridos de la base inicial

### Candidatos

- Acceden a la presentación de la consultora y al listado de vacantes.
- Consultan descripción, ubicación y modalidad.
- Abren un formulario asociado a una oportunidad.
- Completan los campos de postulación, incluidos datos de contacto y CV.

La interfaz inicial no requiere una cuenta de candidato. Eso no convierte la postulación en anónima: el formulario solicita datos personales.

### Empresas y visitantes

- Conocen la propuesta de la consultora.
- Acceden al formulario de contacto.
- Completan una consulta para el equipo de RRHH.

## Arquitectura de la base inicial

```text
Navegador · React
        │
        ▼
Next.js · App Router y API Routes
        │
        ▼
Prisma · Adaptador PostgreSQL
        │
        ▼
PostgreSQL
```

La página principal compone secciones y componentes de interfaz. Obtiene el listado de vacantes mediante `/api/vacancies`; los formularios tienen sus rutas de postulaciones y contactos. El acceso a la base se centraliza en `src/lib/prisma.ts`.

```text
src/
├── app/
│   ├── page.tsx       # Composición de la landing
│   └── api/           # Vacantes, postulaciones y contactos
├── components/        # Navegación, tarjetas y formularios
└── lib/               # Cliente de persistencia y datos de apoyo
prisma/                # Modelos, migraciones y seed
public/                # Recursos visuales de la interfaz
```

Esta arquitectura corresponde a `main`. El trabajo de `develop` amplía el producto y cambia responsabilidades hacia servicios Spring; consultar esa rama antes de trabajar en dicha evolución.

## Stack

- Next.js 16 y React 19.
- TypeScript 5.
- Tailwind CSS 4.
- Prisma 7 y adaptador PostgreSQL.
- PostgreSQL.
- ESLint para análisis estático.

## Preparación local

Entorno recomendado: Node.js 24 LTS, npm y PostgreSQL 16. Crear una base de desarrollo dedicada y trabajar únicamente con datos ficticios.

```bash
npm ci
```

Definir `DATABASE_URL` en un `.env` local con la conexión de desarrollo. No versionar ni compartir ese archivo con credenciales.

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Abrir [localhost:3000](http://localhost:3000). Las migraciones actúan sobre la base configurada: comprobar el destino antes de ejecutarlas.

## Comprobaciones

```bash
npm run lint
npm run build
```

El script `npm run start` sirve una compilación previa. Los cuatro scripts declarados en la base inicial son `dev`, `build`, `start` y `lint`; no incluye una suite de tests configurada.

Antes de ampliar una funcionalidad, revisar su recorrido completo: validación, respuesta de API, persistencia y estados de interfaz. La documentación y las herramientas de `develop` deben revisarse en su propio contexto.

## Preparación pendiente para producción

- Completar y validar autenticación y autorización de las operaciones administrativas.
- Revisar validaciones y protección de las rutas que manejan información personal.
- Definir y comprobar almacenamiento, acceso y retención de CVs.
- Verificar las integraciones de notificaciones y correo.
- Incorporar las comprobaciones y pruebas correspondientes a la versión que se entregue.
- Validar infraestructura, configuración y operación antes de un despliegue productivo.

Estos puntos delimitan el trabajo de preparación: el repositorio no debe tratarse como una instalación lista para procesar datos reales.

## Recursos de la portada

Los banners y diagramas presentan la identidad y los recorridos del proyecto. Las capturas muestran la interfaz en ejecución local con datos de ejemplo.
