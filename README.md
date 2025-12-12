# SPA RRHH - Consultora de Recursos Humanos

Single Page Application para una consultora de RRHH con sistema de postulaciones y gestión de vacantes.

## 📋 Descripción

Plataforma web moderna para consultora de recursos humanos que permite:
- **Para candidatos**: Explorar vacantes disponibles y postularse de forma anónima
- **Para empresas**: Sección informativa sobre servicios para empresas
- **Para administradores**: Backend con API REST para gestión completa de vacantes, postulaciones y consultas

## ✨ Características v0.1.0

### Frontend (Landing Page)
- ✅ Página principal con diseño moderno y responsivo
- ✅ Sección Hero con imagen de fondo y parallax
- ✅ Sección "Nosotros" con información de la consultora
- ✅ Sección "Para Empresas" con servicios ofrecidos
- ✅ Listado de vacantes con filtros por tipo (Tiempo Completo, Medio Tiempo, Freelance)
- ✅ Sistema de postulación con formulario modal (nombre, email, teléfono, CV en PDF/Word)
- ✅ Formulario de contacto
- ✅ Animaciones y efectos hover profesionales
- ✅ Diseño responsive con Tailwind CSS

### Backend (API REST)
- ✅ API REST completa con Next.js App Router
- ✅ Integración con PostgreSQL vía Prisma ORM
- ✅ CRUD completo de vacantes
- ✅ Sistema de postulaciones con validación de vacante activa
- ✅ Sistema de consultas/contactos
- ✅ Datos de prueba (seed) con 5 vacantes

### Base de Datos
- ✅ PostgreSQL 16 configurado localmente
- ✅ Prisma ORM con migraciones aplicadas
- ✅ 3 modelos: Vacancy, Application, Contact
- ✅ Enums para estados y tipos
- ✅ Relaciones entre modelos (CASCADE)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16.0.10, React 19.2.1, TypeScript 5.x
- **Estilos**: Tailwind CSS v4 (nueva arquitectura @theme)
- **Backend**: Next.js API Routes, TypeScript
- **Base de Datos**: PostgreSQL 16
- **ORM**: Prisma 7.1.0 con @prisma/adapter-pg
- **Tipografías**: Geist Sans & Geist Mono (Vercel)
- **Runtime**: Node.js 24.x

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js 24.x o superior
- PostgreSQL 16
- npm, yarn, pnpm o bun

### 1. Clonar el repositorio
```bash
git clone <repository-url>
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

Editar `.env` con tus credenciales de PostgreSQL:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/spa_rrhh_db?schema=public"
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
│   │   ├── api/           # API Routes
│   │   │   ├── vacancies/
│   │   │   ├── applications/
│   │   │   └── contacts/
│   │   ├── layout.tsx     # Layout principal
│   │   ├── page.tsx       # Página principal
│   │   └── globals.css    # Estilos globales + animaciones
│   ├── components/
│   │   ├── NavBar.tsx
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

### Vacancy (Vacantes)
```prisma
- id: String (UUID)
- title: String
- company: String
- location: String
- type: VacancyType (FULL_TIME, PART_TIME, FREELANCE)
- description: String
- requirements: String
- status: VacancyStatus (ACTIVE, INACTIVE, CLOSED)
- createdAt: DateTime
- applications: Application[]
```

### Application (Postulaciones)
```prisma
- id: String (UUID)
- name: String
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
