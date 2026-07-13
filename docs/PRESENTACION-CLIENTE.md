# Sistema de Gestión RRHH — Meinardi & Perlo

## Documento de presentación para el cliente

---

## 1. ¿Qué es este sistema?

Es una **plataforma web** para la gestión de recursos humanos de **Meinardi & Perlo**. Tiene dos caras:

- Una **cara pública** — la que ve la gente que busca trabajo
- Un **panel administrativo** — la que ven ustedes para gestionar todo

El sistema permite publicar ofertas laborales, recibir postulaciones y consultas, y administrar todo desde un mismo lugar.

---

## 2. Recorrido guiado (funcionalidades principales)

### 2.1. Portal público — Lo que ve el candidato

**Página principal (Landing):** Presentación de la empresa.

**Ofertas laborales (`/ofertas-laborales`):** Los postulantes ven todas las vacantes activas con filtros para buscar por:
- Palabra clave (título, descripción, ubicación)o
- Tipo de jornada (completa, media jornada, por proyecto, pasantía)
- Modalidad (presencial, remoto, híbrido)
- Ubicación

Cada oferta muestra: título, descripción, ubicación, salario (si aplica), requisitos, beneficios. El postulante puede aplicar directamente desde ahí.

**Formulario de postulación:** Al aplicar, el candidato completa sus datos (nombre, email, teléfono), adjunta su CV (PDF) y escribe una carta de presentación opcional.

**Formulario de contacto:** Para consultas generales que no sean postulaciones.

### 2.2. Panel de administración — Lo que usan ustedes

Para ingresar: `http://localhost:3000/admin/signin`

**Autenticación:** Acceso con email y contraseña. Solo personal autorizado puede entrar.

**Dashboard (panel principal):** Una vez adentro, ven un tablero con todo lo que necesitan:

#### Pestaña: Vacantes
- Crear nuevas ofertas laborales (título, descripción, ubicación, salario, requisitos, beneficios, tipo de jornada, modalidad)
- Editar ofertas existentes
- Activar/Cerrar ofertas (las activas se ven en el portal público)
- Eliminar ofertas
- Ver estado de cada una

#### Pestaña: Postulaciones
- Ver todas las postulaciones recibidas
- Filtrar por vacante, estado, fecha
- Ver detalle de cada postulación (datos del candidato, CV, carta)
- Cambiar el estado: Pendiente → Revisando → Entrevistado → Aceptado/Rechazado
- Descargar reporte en Excel (CSV)
- Eliminar postulaciones

#### Pestaña: Candidatos
- Lista de personas que han postulado, agrupadas por persona (si alguien aplica a múltiples vacantes, se ve como un solo candidato)
- Ver a qué vacantes aplicó cada candidato y en qué estado está cada postulación
- Editar datos del candidato
- Descargar reporte en Excel (CSV)

#### Pestaña: Contactos
- Ver consultas recibidas desde el formulario de contacto
- Cambiar estado: Pendiente → Respondido → Archivado
- Ver detalle de cada consulta

#### Pestaña: Configuración
- Notificaciones del panel
- Cambiar nombre y email del administrador
- Cambiar contraseña

#### Tutorial guiado (Onboarding)
La primera vez que alguien ingresa al panel, un pequeño tutorial interactivo le muestra dónde está cada cosa.

### 2.3. Seguridad y protección

- **Autenticación segura:** Solo usuarios autorizados pueden acceder al panel
- **Recuperación de contraseña:** Si olvidan la contraseña, pueden solicitar un reset por email
- **Protección anti-spam:** Los formularios públicos usan Cloudflare Turnstile (ese "no soy un robot" invisible)
- **Límite de envíos:** No se puede enviar el mismo formulario muchas veces en poco tiempo
- **Registro de auditoría:** Cada acción importante en el panel queda registrada (quién hizo qué y cuándo)
- **Retención de datos:** Los CVs y registros de auditoría se limpian automáticamente después de un tiempo (según normativa)

---

## 3. Arquitectura en criollo (cómo funciona por dentro)

Imaginen tres capas:

```
[NAVEGADOR] ──llama──> [SERVIDOR WEB] ──consulta──> [BASE DE DATOS]
   (Next.js)            (API + Spring Boot)          (PostgreSQL)
```

- **Frontend (lo que se ve):** Hecho con Next.js (React). Es el sitio que se ve bonito, con los colores y el diseño responsivo (funciona en celular, tablet y computadora).
- **Backend (el motor):** La parte pública (postulaciones, contacto, vacantes) se maneja desde el mismo Next.js. Funcionalidades más complejas de gestión de vacantes usan un backend separado en Spring Boot (Java).
- **Base de datos:** PostgreSQL. Guarda todo: usuarios, vacantes, postulaciones, candidatos, contactos.
- **Archivos (CVs):** Se almacenan en UploadThing (un servicio en la nube para archivos).
- **Email:** Se usa Resend para enviar notificaciones y recuperación de contraseña.

### Stack tecnológico (para que lo entienda un técnico):

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend público | Next.js API Routes |
| Backend vacantes | Spring Boot 3.5 (Java 21) |
| Base de datos | PostgreSQL 16 |
| ORM | Prisma |
| Autenticación | NextAuth |
| Archivos | UploadThing |
| Email | Resend |
| Tests unitarios | Vitest |
| Tests E2E | Playwright |

---

## 4. Estado del proyecto

**Versión actual:** v0.2.x — **Operativo para uso real** con el flujo core funcionando:
- Portal público publicando vacantes
- Recepción de postulaciones con CV
- Recepción de consultas de contacto
- Panel administrativo completo

**Escalabilidad esperada:**
- 1 a 5 administradores
- Menos de 100 vacantes activas simultáneas
- Menos de 500 postulaciones por mes

---

## 5. Posibles cambios y mejoras (preparado para la entrevista)

Estos son temas que suelen surgir. Acá va mi recomendación técnica para cada uno:

### "Queremos que los candidatos puedan crearse un perfil y hacer seguimiento"
- **Implicancia:** Habría que agregar registro de usuarios, login para candidatos, y un panel "Mi perfil" con historial de postulaciones.
- **Complejidad:** Media-alta. Implica cambios en base de datos, autenticación y frontend.

### "Necesitamos más roles de administrador (supervisor, editor, solo lectura)"
- **Implicancia:** Ampliar el sistema de roles y permisos en cada acción del panel.
- **Complejidad:** Media. Ya hay una base con el modelo de roles.

### "¿Se puede integrar con LinkedIn u otros portales?"
- **Implicancia:** Requiere API de LinkedIn y un mecanismo para publicar/importar desde allí.
- **Complejidad:** Alta (depende de terceros).

### "Queremos reportes más avanzados (gráficos, estadísticas)"
- **Implicancia:** Agregar dashboard con gráficos de postulaciones por período, vacantes más solicitadas, tiempo promedio de contratación, etc.
- **Complejidad:** Media. Se puede hacer con librerías de gráficos en el frontend.

### "Necesitamos búsqueda inteligente de candidatos"
- **Implicancia:** Indexar los datos de candidatos para búsqueda por palabras clave, filtrar por skills, experiencia, etc.
- **Complejidad:** Media-alta.

### "¿Se puede mandar email automático al cambiar estado de postulación?"
- **Implicancia:** Notificar al candidato cuando su estado cambia (ej: "Pasaste a la etapa de entrevista").
- **Complejidad:** Baja. Ya tenemos Resend configurado para emails.

### "Queremos que el sistema funcione en inglés también"
- **Implicancia:** Agregar sistema de internacionalización (i18n) con traducciones.
- **Complejidad:** Media.

### "¿Podemos tener múltiples sucursales/empresas?"
- **Implicancia:** Agregar un nivel organizacional arriba de vacantes (empresa/sucursal).
- **Complejidad:** Media-alta. Cambia el modelo de datos significativamente.

### "Necesitamos que los CVs se vean online sin descargar"
- **Implicancia:** Visor de PDF embebido en el panel.
- **Complejidad:** Baja. Ya están subidos, solo falta mostrarlos.

---

## 6. Preguntas frecuentes que puede hacer el cliente

### "¿Los datos están seguros?"
Sí. La autenticación usa encriptación, las contraseñas se guardan hasheadas (no en texto plano), y los formularios públicos tienen protección anti-spam. Además hay un registro de auditoría de todo lo que se hace en el panel.

### "¿Qué pasa si se cae el servidor?"
Todo el sistema corre en la nube (Vercel para el frontend, Railway/similar para el backend, Neon/Railway para la base de datos). Si un servicio se cae, se levanta automáticamente.

### "¿Cuánto cuesta mantener esto?"
Depende del proveedor cloud, pero al escala esperada es muy económico (plan gratuito o pocos dólares al mes en cada servicio).

### "¿Puedo usarlo desde el celular?"
Sí. El diseño es **responsivo** — se adapta a celulares, tablets y computadoras.

### "¿Podemos agregar X funcionalidad más adelante?"
Sí, la arquitectura está pensada para crecer. Cada funcionalidad nueva se puede agregar sin romper lo existente.

---

## 7. Comandos básicos para mostrar el sistema

En la computadora local (desarrollo):

```bash
# 1. Base de datos + Backend Spring Boot (Java)
docker compose -f docker-compose.backend.yml up -d

# 2. Frontend (Next.js)
npm run dev
```

Luego abrir:
- **Portal público:** `http://localhost:3000`
- **Panel admin:** `http://localhost:3000/admin/signin`
- **Backend API:** `http://localhost:8080`

---

## 8. Checklist pre-demo

- [ ] Base de datos corriendo (Docker)
- [ ] Backend Spring Boot corriendo
- [ ] Frontend Next.js corriendo (`npm run dev`)
- [ ] Al menos 2-3 vacantes de ejemplo cargadas
- [ ] Una postulación de prueba (para mostrar cómo llega)
- [ ] Un contacto de prueba
- [ ] Puerto 8080 libre (ya lo matamos)
- [ ] Tener a mano email y contraseña del admin para mostrar el panel
