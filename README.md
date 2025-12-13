# SPA RRHH - Consultora de Recursos Humanos

Sistema web completo para consultora de recursos humanos Meinardi&Perlo RRHH de Las Varillas, Córdoba.

## 🚀 Versiones

### v0.1.0 - Landing Page y Backend Inicial ✅
- Landing page completa con secciones:
  - Hero con presentación de la consultora
  - Nosotros (perfiles de fundadoras)
  - Vacantes disponibles
  - Empresas asociadas
  - Formulario de contacto
- Backend con API REST
- Base de datos PostgreSQL
- Modelos: Vacancy, Application, Contact
- Seed con datos de ejemplo

### v0.2.0 - Panel de Administración y Gestión de Vacantes 🚧 (En desarrollo)

#### ✅ Completado:
- **Sistema de Autenticación:**
  - NextAuth.js con CredentialsProvider
  - Modelo User con roles (ADMIN/USER)
  - Protección de rutas con middleware
  - Hash de contraseñas con bcrypt
  - Sesiones JWT

- **Panel de Administración:**
  - Dashboard con estadísticas:
    - Total de vacantes
    - Vacantes activas
    - Total de postulaciones
    - Consultas pendientes
  - CRUD completo de vacantes con modal form
  - Cambio de estado (Activa/Cerrada)
  - Tabla con filtros y acciones

- **Sistema de Vacantes Mejorado:**
  - Nuevos campos: `workday` (jornada) y `modality` (modalidad)
  - Tipos de jornada:
    - Jornada Completa
    - Media Jornada
    - Por Proyecto
    - Pasantía
  - Tipos de modalidad:
    - Presencial
    - Remoto
    - Híbrido
  - Cards expandibles con detalles (+/-)
  - Visualización de requisitos y beneficios
  - Badges con colores diferenciados

- **Mejoras de UX:**
  - Formulario de postulación con inputs legibles (text-gray-900)
  - Tooltips en botones de acción
  - Animaciones y transiciones
  - Navbar del admin con fondo azul
  - Botones de cerrar/activar con emojis y colores

#### 🔜 Pendiente:
- Vista de gestión de postulaciones
- Vista de gestión de consultas
- Sistema de notificaciones por email
- Gestión de usuarios admin adicionales
- Filtros avanzados y búsqueda
- Paginación para grandes conjuntos de datos
- Exportación de datos (CVs, reportes)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16.0.10, React 19.2.1, TypeScript 5.x
- **Estilos**: Tailwind CSS v4 (nueva arquitectura @theme)
- **Backend**: Next.js API Routes, TypeScript
- **Base de Datos**: PostgreSQL 16
- **ORM**: Prisma 7.1.0 con @prisma/adapter-pg
- **Autenticación**: NextAuth.js con bcrypt
- **Tipografías**: Geist Sans & Geist Mono (Vercel)
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

Editar `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/spa_rrhh_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui"
ADMIN_PASSWORD="admin123"
```

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

## 🔐 Acceso al Panel de Administración

- **URL:** http://localhost:3000/admin
- **Email:** admin@sparrhh.com
- **Contraseña:** admin123 (configurable en ADMIN_PASSWORD)

## 📁 Estructura del Proyecto

```
spa-rrhh/
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   ├── seed.ts            # Datos de prueba
│   └── migrations/        # Historial de migraciones
├── public/
│   ├── hero-bg.jpg        # Imagen de fondo Hero
│   ├── nosotros-bg.jpg    # Imagen de fondo Nosotros
│   └── empresas-bg.jpg    # Imagen de fondo Empresas
├── src/
│   ├── app/
│   │   ├── admin/         # Panel de administración
│   │   ├── api/           # API Routes
│   │   │   ├── auth/      # NextAuth endpoints
│   │   │   ├── vacancies/
│   │   │   ├── applications/
│   │   │   └── contacts/
│   │   ├── layout.tsx     # Layout principal
│   │   ├── page.tsx       # Página principal
│   │   └── globals.css    # Estilos globales + animaciones
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── AuthProvider.tsx
│   │   └── VacancyCard.tsx
│   │   ├── Hero.tsx
│   │   ├── Nosotros.tsx
│   │   ├── Empresas.tsx
│   │   ├── Vacantes.tsx
│   │   ├── PostularForm.tsx
│   │   ├── ContactForm.tsx
│   │   └── Footer.tsx
│   └── lib/
│       └── prisma.ts      # Cliente Prisma singleton
├── .env.example           # Template de variables de entorno
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## 🗄️ Modelos de Base de Datos

### User (Usuarios Admin)
```prisma
- id: String (CUID)
- email: String (unique)
- name: String?
- passwordHash: String
- role: Role (ADMIN, USER)
- createdAt: DateTime
- updatedAt: DateTime
```

### Vacancy (Vacantes)
```prisma
- id: String (CUID)
- title: String
- description: String
- location: String
- workday: VacancyWorkday (FULL_TIME, PART_TIME, PROJECT_BASED, INTERNSHIP)
- modality: VacancyModality (ON_SITE, REMOTE, HYBRID)
- salary: String?
- requirements: String?
- benefits: String?
- status: VacancyStatus (ACTIVE, CLOSED, DRAFT)
- createdAt: DateTime
- updatedAt: DateTime
- applications: Application[]
```

### Application (Postulaciones)
```prisma
- id: String (CUID)
- vacancyId: String
- candidateName: String
- email: String
- phone: String
- resumeData: String? (Base64)
- resumeFileName: String?
- coverLetter: String?
- status: ApplicationStatus (PENDING, REVIEWING, INTERVIEWED, ACCEPTED, REJECTED)
- submittedAt: DateTime
- updatedAt: DateTime
- vacancy: Vacancy
```

### Contact (Consultas)
```prisma
- id: String (CUID)
- name: String
- email: String
- phone: String
- subject: String
- message: String
- status: ContactStatus (PENDING, ANSWERED)
- createdAt: DateTime
- updatedAt: DateTime
```
- email: String
- phone: String
- cvData: String (Base64)
- cvFileName: String
- status: ApplicationStatus (PENDING, REVIEWING, ACCEPTED, REJECTED)
- vacancyId: String
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
