CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "VacancyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED', 'DRAFT');
CREATE TYPE "VacancyWorkday" AS ENUM ('FULL_TIME', 'PART_TIME', 'PROJECT_BASED', 'INTERNSHIP');
CREATE TYPE "VacancyModality" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'INTERVIEWED', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'RESPONDED', 'ARCHIVED');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'ERROR');
CREATE TYPE "NotificationLevel" AS ENUM ('INFO', 'SUCCESS', 'WARNING');
CREATE TYPE "AdminNotificationActionType" AS ENUM ('VACANCY', 'APPLICATION', 'CONTACT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "notifyNewApplications" BOOLEAN NOT NULL DEFAULT true,
  "notifyNewContacts" BOOLEAN NOT NULL DEFAULT true,
  "notifySecurityAlerts" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "outcome" "AuditOutcome" NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotification" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "level" "NotificationLevel" NOT NULL DEFAULT 'INFO',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "actionLabel" TEXT,
  "actionType" "AdminNotificationActionType",
  "actionResourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vacancy" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "salary" TEXT,
  "requirements" TEXT,
  "benefits" TEXT,
  "status" "VacancyStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "modality" "VacancyModality" NOT NULL DEFAULT 'ON_SITE',
  "workday" "VacancyWorkday" NOT NULL DEFAULT 'FULL_TIME',
  CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Candidate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "personKey" TEXT NOT NULL,
  "resumeFileName" TEXT,
  "resumeKey" TEXT,
  "resumeUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "vacancyId" TEXT,
  "candidateId" TEXT NOT NULL,
  "coverLetter" TEXT,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "personKey" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE permiso (
  id VARCHAR(255) NOT NULL,
  descripcion VARCHAR(255),
  nombre VARCHAR(255),
  PRIMARY KEY (id)
);

CREATE TABLE rol (
  id VARCHAR(255) NOT NULL,
  descripcion VARCHAR(255),
  nombre VARCHAR(255),
  PRIMARY KEY (id)
);

CREATE TABLE rol_permiso (
  rol_id VARCHAR(255) NOT NULL,
  permiso_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (rol_id) REFERENCES rol (id),
  CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (permiso_id) REFERENCES permiso (id)
);

CREATE TABLE usuario (
  id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL,
  nombre_usuario VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  password_reset_token VARCHAR(255),
  password_reset_token_expiry TIMESTAMP(6) WITH TIME ZONE,
  rol_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES rol (id)
);

CREATE TABLE candidato (
  id VARCHAR(255) NOT NULL,
  apellido VARCHAR(255),
  created_at TIMESTAMP(6) WITH TIME ZONE,
  cv VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  person_key VARCHAR(255),
  resume_file_name VARCHAR(255),
  resume_key VARCHAR(255),
  resume_url VARCHAR(255),
  telefono VARCHAR(255),
  updated_at TIMESTAMP(6) WITH TIME ZONE,
  PRIMARY KEY (id)
);

CREATE TABLE vacante (
  id VARCHAR(255) NOT NULL,
  descripcion TEXT,
  estado_actual VARCHAR(255),
  fecha_creacion TIMESTAMP(6) WITH TIME ZONE,
  fecha_publicacion TIMESTAMP(6) WITH TIME ZONE,
  jornada VARCHAR(255),
  modalidad VARCHAR(255),
  requisitos TEXT,
  titulo VARCHAR(255),
  ubicacion_descripcion VARCHAR(255),
  ubicacion_nombre VARCHAR(255),
  PRIMARY KEY (id)
);

CREATE TABLE postulacion (
  id VARCHAR(255) NOT NULL,
  estado_actual VARCHAR(255),
  fecha_postulacion TIMESTAMP(6) WITH TIME ZONE,
  observacion TEXT,
  submitted_at TIMESTAMP(6) WITH TIME ZONE,
  updated_at TIMESTAMP(6) WITH TIME ZONE,
  candidato_id VARCHAR(255) NOT NULL,
  vacante_id VARCHAR(255),
  PRIMARY KEY (id),
  CONSTRAINT fk_postulacion_candidato FOREIGN KEY (candidato_id) REFERENCES candidato (id),
  CONSTRAINT fk_postulacion_vacante FOREIGN KEY (vacante_id) REFERENCES vacante (id)
);

CREATE TABLE contacto (
  id VARCHAR(255) NOT NULL,
  asunto VARCHAR(255),
  email VARCHAR(255),
  estado_actual VARCHAR(255),
  fecha_contacto TIMESTAMP(6) WITH TIME ZONE,
  mensaje TEXT,
  nombre VARCHAR(255),
  person_key VARCHAR(255),
  telefono VARCHAR(255),
  updated_at TIMESTAMP(6) WITH TIME ZONE,
  PRIMARY KEY (id)
);

CREATE TABLE estado (
  id VARCHAR(255) NOT NULL,
  ambito VARCHAR(255),
  nombre VARCHAR(255),
  PRIMARY KEY (id)
);

CREATE TABLE estado_historial (
  id VARCHAR(255) NOT NULL,
  fecha_hora_cambio TIMESTAMP(6) WITH TIME ZONE,
  observacion VARCHAR(255),
  estado_id VARCHAR(255),
  PRIMARY KEY (id),
  CONSTRAINT fk_estado_historial_estado FOREIGN KEY (estado_id) REFERENCES estado (id)
);

CREATE TABLE "user" (
  email VARCHAR(255) NOT NULL UNIQUE,
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE INDEX "User_email_idx" ON "User" ("email");
CREATE UNIQUE INDEX "AdminSettings_userId_key" ON "AdminSettings" ("userId");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken" ("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken" ("userId", "expiresAt");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog" ("createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog" ("action", "createdAt");
CREATE INDEX "AdminAuditLog_resourceType_createdAt_idx" ON "AdminAuditLog" ("resourceType", "createdAt");
CREATE INDEX "AdminAuditLog_actorEmail_createdAt_idx" ON "AdminAuditLog" ("actorEmail", "createdAt");
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification" ("createdAt");
CREATE INDEX "AdminNotification_isRead_createdAt_idx" ON "AdminNotification" ("isRead", "createdAt");
CREATE INDEX "Vacancy_status_createdAt_idx" ON "Vacancy" ("status", "createdAt");
CREATE UNIQUE INDEX "Candidate_personKey_key" ON "Candidate" ("personKey");
CREATE INDEX "Candidate_email_idx" ON "Candidate" ("email");
CREATE INDEX "Candidate_personKey_createdAt_idx" ON "Candidate" ("personKey", "createdAt");
CREATE INDEX "Application_vacancyId_status_idx" ON "Application" ("vacancyId", "status");
CREATE INDEX "Application_candidateId_submittedAt_idx" ON "Application" ("candidateId", "submittedAt");
CREATE INDEX "Contact_status_createdAt_idx" ON "Contact" ("status", "createdAt");
CREATE INDEX "Contact_personKey_createdAt_idx" ON "Contact" ("personKey", "createdAt");
CREATE UNIQUE INDEX uk_usuario_email ON usuario (email);
CREATE UNIQUE INDEX uk_candidato_person_key ON candidato (person_key);
CREATE UNIQUE INDEX uk_contacto_person_key ON contacto (person_key);
