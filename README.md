# SPA RRHH - Consultora de Recursos Humanos

Sistema web completo para la consultora de Recursos Humanos **Meinardi&Perlo RRHH** de Las Varillas, Córdoba.

## 🎯 Objetivo

Plataforma digital que conecta talento con oportunidades laborales, facilitando:
- Publicación y gestión de ofertas de empleo
- Proceso de postulación simplificado para candidatos
- Canal de comunicación directa entre empresas y la consultora
- Panel de administración para gestión eficiente de vacantes, postulaciones y contactos

## ✨ Características Principales

### Para Candidatos
- Exploración de ofertas laborales con filtros avanzados (ubicación, jornada, modalidad)
- Sistema de postulación con carga de CV
- Página dedicada `/ofertas-laborales` con búsqueda en tiempo real
- Visualización detallada de requisitos y beneficios

### Para Administradores
- Panel de administración completo con autenticación
- Gestión de vacantes (crear, editar, activar/cerrar)
- Administración de postulaciones con cambio de estados
- Gestión de consultas y mensajes de contacto
- Paginación, búsqueda y filtros en todas las tablas
- Dashboard con estadísticas en tiempo real

### SEO y Optimización
- Metadata completa (Open Graph, Twitter Cards)
- Sitemap automático con prioridades
- Robots.txt configurado
- Schema.org structured data (ProfessionalService)
- Favicon optimizado

## 🚀 Versiones

### v0.2.0 - Gestión Admin, UI/UX y Optimizaciones ✅

**Funcionalidades implementadas:**
- Panel de administración con tabs (Vacantes, Postulaciones, Contactos)
- Sistema de autenticación con NextAuth (roles ADMIN/USER)
- Paginación de 10 items por página en todas las tablas
- Búsqueda y filtros en postulaciones y contactos
- Confirmaciones antes de eliminaciones
- Normalización automática de ubicaciones
- Página pública `/ofertas-laborales` con filtros avanzados
- Sección "Servicios" con 4 servicios principales
- Componentes reutilizables: `Pagination`, `ServiceCard`, `Servicios`

**SEO y metadata:**
- Sitemap.ts automático
- Robots.ts para control de crawlers
- Metadata completa con keywords
- Schema.org JSON-LD

**UI/UX:**
- Navbar mejorado con animación en "RRHH"
- Logos integrados (consultora + empresas asociadas)
- Animaciones sutiles y efectos hover
- Cards con soporte para imágenes reales vía Next.js Image
- Diseño responsive optimizado

**Assets:**
- 4 imágenes de servicios
- 2 logos (consultora + TBEH)
- Icon.png optimizado para favicon

### v0.1.0 - Landing Page y Backend Inicial ✅
- Landing page completa con secciones: Hero, Nosotros, Vacantes, Empresas, Contacto
- Backend con API REST
- Base de datos PostgreSQL con Prisma
- Modelos: Vacancy, Application, Contact
- Seed con datos de ejemplo

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16.0.10, React 19.2.1, TypeScript 5.x
- **Estilos**: Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL 16
- **ORM**: Prisma 7.1.0
- **Autenticación**: NextAuth.js
- **Tipografías**: Geist Sans & Geist Mono
- **Runtime**: Node.js 24.x

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js 24.x o superior
- PostgreSQL 16
- npm, yarn, pnpm o bun

### 1. Clonar el repositorio
```bash
git clone https://github.com/MaxiPerlo15/spa-rrhh.git
cd spa-rrhh
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de PostgreSQL y secretos de NextAuth.

### 4. Configurar base de datos
```bash
# Crear base de datos en PostgreSQL
createdb spa_rrhh_db

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Cargar datos de prueba
npx prisma db seed
```

### 5. Ejecutar el servidor de desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## 📁 Estructura del Proyecto

```
spa-rrhh/
├── docs/                  # Documentación
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   ├── seed.ts            # Datos de prueba
│   └── migrations/        # Historial de migraciones
├── public/
│   ├── hero-bg.jpg        # Assets principales
│   ├── servicio1-4.png    # Imágenes de servicios
│   ├── logorrhh.png       # Logo consultora
│   └── logo-tbeh.png      # Logo empresa asociada
├── scripts/
│   └── normalize-locations.ts  # Script de normalización
├── src/
│   ├── app/
│   │   ├── admin/         # Panel de administración
│   │   │   ├── page.tsx   # Dashboard con tabs
│   │   │   └── signin/    # Página de login
│   │   ├── api/           # API Routes
│   │   │   ├── auth/      # NextAuth endpoints
│   │   │   ├── vacancies/ # CRUD vacantes
│   │   │   ├── applications/ # CRUD postulaciones
│   │   │   └── contacts/  # CRUD contactos
│   │   ├── ofertas-laborales/ # Página pública de ofertas
│   │   ├── layout.tsx     # Layout principal con metadata
│   │   ├── page.tsx       # Página principal
│   │   ├── sitemap.ts     # Sitemap automático
│   │   ├── robots.ts      # Robots.txt
│   │   ├── icon.png       # Favicon
│   │   └── globals.css    # Estilos globales + animaciones
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── Hero.tsx
│   │   ├── FounderCard.tsx
│   │   ├── Servicios.tsx
│   │   ├── ServiceCard.tsx
│   │   ├── VacancyCard.tsx
│   │   ├── Pagination.tsx
│   │   ├── Empresas.tsx
│   │   ├── PostularForm.tsx
│   │   ├── ContactForm.tsx
│   │   ├── AuthProvider.tsx
│   │   └── Footer.tsx
│   ├── 
- Sistema de usuarios con roles (ADMIN/USER)
- Autenticación con NextAuth

### Vacancy (Vacantes)
```prisma
- id, title, description, location
- workday: FULL_TIME | PART_TIME | PROJECT_BASED | INTERNSHIP
- modality: ON_SITE | REMOTE | HYBRID
- salary, requirements, benefits (opcionales)
- status: ACTIVE | CLOSED | DRAFT
- timestamps
```

### Application (Postulaciones)
```prisma
- id, vacancyId
- candidateName, email, phone
- resumeData (Base64), resumeFileName
- coverLetter (opcional)
- status: PENDING | REVIEWING | INTERVIEWED | ACCEPTED | REJECTED
- timestamps
```

### Contact (Consultas)
```prisma
- id, name, email, phone
- subject, message
- status: PENDING | RESPONDED | ARCHIVED
- timestamps
- vacancy: Vacancy
- createdAt: DateTime
```

### Contact (Consultas)
```prisma
- id: String (UUID)
- name: String
- email: String
- message: String
- status: ContactStatus (PENDING, ANSWERED)
- createdAt: DateTime
```

## 🔌 API Endpoints

### Vacantes
- `GET /api/vacancies` - Listar vacantes activas
- `POST /api/vacancies` - Crear vacante (admin)
- `GET /api/vacancies/[id]` - Obtener vacante por ID
- `PUT /api/vacancies/[id]` - Actualizar vacante (admin)
- `DELETE /api/vacancies/[id]` - Eliminar vacante (admin)

### Postulaciones
- `GET /api/applications` - Listar postulaciones (admin)
- `POST /api/applications` - Crear postulación (público)

### Contactos
- `GET /api/contacts` - Listar consultas (admin)
- `POST /api/contacts` - Enviar consulta (público)

## 🎨 Paleta de Colores

**Azul Francia** (Tema principal):
- Primary: `#0055A4` (Azul Francia)
- Secondary: `#EF4135` (Rojo complementario)
- Gradientes y variantes en componentes

## 📜 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Ejecutar build de producción
npm run lint         # Ejecutar ESLint
npx prisma studio    # Explorador visual de BD
npx prisma migrate dev  # Crear migración
npx prisma db seed   # Cargar datos de prueba
```

## 🗺️ Roadmap

### v0.1.0 (Actual) ✅
- Landing page completa
- Sistema de postulaciones
- API REST backend
- Base de datos PostgreSQL + Prisma

### v0.2.0 (Próximo)
- Panel de administración
- Autenticación y autorización (NextAuth)
- Dashboard con métricas
- Gestión visual de vacantes, postulaciones y consultas

### v0.3.0
- Sistema de notificaciones por email (Resend/Nodemailer)
- Confirmaciones de postulación
- Alertas a administradores

### v1.0.0
- Optimización para producción
- Tests unitarios e integración
- Deploy en Vercel/Railway
- Documentación completa de API

## 🐛 Issues Conocidos

- Panel de administración pendiente (v0.2.0)
- Sin autenticación (endpoints admin son públicos actualmente)
- Sin sistema de emails automatizados

## 👥 Equipo

Desarrollado por Maxi Perlo

## 📞 Contacto

Para consultas sobre el proyecto: [Agregar información de contacto]

---

**Versión**: 0.1.0  
**Última actualización**: Diciembre 2024
