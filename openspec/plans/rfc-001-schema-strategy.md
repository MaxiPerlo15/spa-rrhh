# RFC-001: Schema Strategy — Prisma to JPA Migration

**Status**: Accepted (2026-07-04)  
**Date**: 2026-07-04  
**Author**: AI + Maxi  
**Decision**: Option B — Rename JPA tables to English, add missing columns

## Context

The project currently has **two sets of tables** in the same PostgreSQL database:

1. **Prisma tables** (English, PascalCase) — created by Prisma migrations
2. **JPA tables** (Spanish, lowercase) — created by Spring Boot / JPA

These are **NOT the same tables**. They have different names, different columns, and different relationships.

## Decisions Made

| Decision | Choice |
|---|---|
| Project language | **English** (despite being Argentine) |
| `salary` and `benefits` | **Add to JPA** `Vacante` entity |
| `personKey` | **Add to JPA** `Candidato` and `Contacto` entities |
| `AdminAuditLog` / `AdminNotification` | **Migrate to JPA** |
| Table naming | **English** (match Prisma convention) |

## Target State

All tables use **English PascalCase** naming, owned by JPA.

| Current JPA Table | Target JPA Table | Action |
|---|---|---|
| `vacante` | `Vacancy` | Rename |
| `postulacion` | `Application` | Rename |
| `candidato` | `Candidate` | Rename + add columns |
| `contacto` | `Contact` | Rename + add columns |
| `usuario` | `User` | Rename |
| `rol` | `Role` | Rename |
| `permiso` | `Permission` | Rename |
| `rol_permiso` | `RolePermission` | Rename |

## Column Mapping

### Vacancy (was `vacante`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `titulo` | `title` | Rename |
| `descripcion` | `description` | Rename |
| `requisitos` | `requirements` | Rename |
| `ubicacion_nombre` | `location` | Simplify (single column) |
| `ubicacion_descripcion` | — | Merge into `location` |
| `jornada` | `workday` | Rename |
| `modalidad` | `modality` | Rename |
| `fechaCreacion` | `createdAt` | Rename |
| `fechaPublicacion` | `publishedAt` | Rename |
| `estadoActual` | `status` | Rename |
| — | `salary` | **ADD** |
| — | `benefits` | **ADD** |
| — | `updatedAt` | **ADD** |

### Application (was `postulacion`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `fechaPostulacion` | `submittedAt` | Rename |
| `observacion` | `coverLetter` | Rename |
| `estadoActual` | `status` | Rename |
| `vacante_id` | `vacancyId` | Rename |
| `candidato_id` | `candidateId` | Rename |
| — | `updatedAt` | **ADD** |

### Candidate (was `candidato`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `nombre` | `name` | Rename |
| `apellido` | `lastName` | Rename |
| `email` | `email` | Keep |
| `telefono` | `phone` | Rename |
| `cv` | `resumeFileName` | Rename |
| — | `personKey` | **ADD** |
| — | `resumeKey` | **ADD** |
| — | `resumeUrl` | **ADD** |
| — | `createdAt` | **ADD** |
| — | `updatedAt` | **ADD** |

### Contact (was `contacto`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `nombre` | `name` | Rename |
| `email` | `email` | Keep |
| `telefono` | `phone` | Rename |
| `mensaje` | `message` | Rename |
| `fechaContacto` | `createdAt` | Rename |
| `tipo` | — | DROP (not in Prisma) |
| `estadoActual` | `status` | Rename |
| — | `personKey` | **ADD** |
| — | `subject` | **ADD** |
| — | `updatedAt` | **ADD** |

### User (was `usuario`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `email` | `email` | Keep |
| `password` | `passwordHash` | Rename |
| `nombreUsuario` | `name` | Rename |
| `rol_id` | `role` | Rename (enum, not FK) |
| `passwordResetToken` | — | Keep (temporary) |
| `passwordResetTokenExpiry` | — | Keep (temporary) |
| — | `createdAt` | **ADD** |
| — | `updatedAt` | **ADD** |

### Role (was `rol`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `nombre` | `name` | Rename |
| `descripcion` | `description` | Rename |

### Permission (was `permiso`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `nombre` | `name` | Rename |
| `descripcion` | `description` | Rename |

### RolePermission (was `rol_permiso`)

| Current JPA Column | Target Column | Action |
|---|---|---|
| `rol_id` | `roleId` | Rename |
| `permiso_id` | `permissionId` | Rename |

### AdminAuditLog (NEW — migrate from Prisma)

| Prisma Column | JPA Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `actorUserId` | `actorUserId` | Keep |
| `actorEmail` | `actorEmail` | Keep |
| `action` | `action` | Keep |
| `resourceType` | `resourceType` | Keep |
| `resourceId` | `resourceId` | Keep |
| `outcome` | `outcome` | Keep |
| `ip` | `ip` | Keep |
| `userAgent` | `userAgent` | Keep |
| `metadata` | `metadata` | Keep (JSON) |
| `createdAt` | `createdAt` | Keep |

### AdminNotification (NEW — migrate from Prisma)

| Prisma Column | JPA Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `title` | `title` | Keep |
| `message` | `message` | Keep |
| `level` | `level` | Keep |
| `isRead` | `isRead` | Keep |
| `actionLabel` | `actionLabel` | Keep |
| `actionType` | `actionType` | Keep |
| `actionResourceId` | `actionResourceId` | Keep |
| `createdAt` | `createdAt` | Keep |
| `updatedAt` | `updatedAt` | Keep |

### AdminSettings (NEW — migrate from Prisma)

| Prisma Column | JPA Column | Action |
|---|---|---|
| `id` | `id` | Keep |
| `userId` | `userId` | Keep |
| `notificationsEnabled` | `notificationsEnabled` | Keep |
| `notifyNewApplications` | `notifyNewApplications` | Keep |
| `notifyNewContacts` | `notifyNewContacts` | Keep |
| `notifySecurityAlerts` | `notifySecurityAlerts` | Keep |
| `createdAt` | `createdAt` | Keep |
| `updatedAt` | `updatedAt` | Keep |

## Migration Plan

### Phase 1: Update JPA Entities (Days 1–2)
- Rename all JPA `@Table` annotations to English
- Rename all JPA column mappings to English
- Add missing columns (`salary`, `benefits`, `personKey`, `resumeKey`, `resumeUrl`, `subject`, `createdAt`, `updatedAt`)
- Create new JPA entities: `AdminAuditLog`, `AdminNotification`, `AdminSettings`
- Update JPA enums to English

### Phase 2: Data Migration (Days 3–4)
- Write SQL migration scripts:
  - Rename tables: `ALTER TABLE vacante RENAME TO "Vacancy"`
  - Rename columns: `ALTER TABLE "Vacancy" RENAME COLUMN titulo TO title`
  - Add columns: `ALTER TABLE "Vacancy" ADD COLUMN salary TEXT`
  - Migrate data: `INSERT INTO "AdminAuditLog" SELECT * FROM "AdminAuditLog"` (same table)
- Run in staging first
- Verify data integrity

### Phase 3: Service Migration (Days 5–7)
- Update Spring services to use new column names
- Update Next.js API routes to delegate to Spring
- Remove Prisma client usage

### Phase 4: Cleanup (Day 8)
- Drop Prisma tables (if any remain)
- Remove Prisma dependencies
- Archive schema as historical reference

## Enums to Migrate

| Current JPA Enum | Target JPA Enum | Values |
|---|---|---|
| `VacancyStatus` | `VacancyStatus` | ACTIVE, INACTIVE, CLOSED, DRAFT |
| `Jornada` | `Workday` | FULL_TIME, PART_TIME, PROJECT_BASED, INTERNSHIP |
| `Modalidad` | `Modality` | ON_SITE, REMOTE, HYBRID |
| `ApplicationStatus` | `ApplicationStatus` | PENDING, REVIEWING, INTERVIEWED, ACCEPTED, REJECTED |
| `ContactStatus` | `ContactStatus` | PENDING, RESPONDED, ARCHIVED |
| `TipoContacto` | — | DROP (not in Prisma) |
| `Estado` | — | Review (may be obsolete) |
| `EstadoHistorial` | — | Review (may be obsolete) |
| `EstadoAmbito` | — | Review (may be obsolete) |

## Success Criteria

- [ ] All JPA tables use English PascalCase naming
- [ ] All JPA columns use English camelCase naming
- [ ] Missing columns added (`salary`, `benefits`, `personKey`, `resumeKey`, `resumeUrl`, `subject`)
- [ ] New entities created (`AdminAuditLog`, `AdminNotification`, `AdminSettings`)
- [ ] Data migrated successfully
- [ ] No data loss
- [ ] Spring services updated to use new names
- [ ] Prisma removed completely
