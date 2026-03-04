# 01. Alcance Completo del Sistema

## 1. Propósito

Definir de forma precisa el alcance funcional y no funcional del sistema web de consultoría RRHH, delimitando responsabilidades, usuarios, fronteras e integraciones.

## 2. Contexto de negocio

La consultora requiere:
- Publicar y administrar vacantes.
- Capturar postulaciones y consultas de contacto.
- Operar un panel administrativo centralizado con trazabilidad.

## 3. Frontera del sistema

Dentro del sistema:
- Landing pública y página de ofertas.
- APIs de vacantes, postulaciones, contactos.
- Panel administrativo con autenticación.
- Notificaciones internas, auditoría y hardening de seguridad.

Fuera del sistema:
- ERP externo de nómina.
- Firma digital externa.
- BI corporativo formal.

## 4. Actores

- Candidato/a (externo).
- Empresa cliente (externo indirecto).
- Administrador de consultora (interno).
- Sistema Resend (externo).
- Sistema UploadThing (externo).
- Cloudflare Turnstile (externo).
- Upstash Redis (externo).
- Neon PostgreSQL (externo administrado).

## 5. In-Scope

- Publicación y filtrado de vacantes activas.
- Postulación con CV.
- Formulario de contacto.
- Gestión CRUD de vacantes en panel admin.
- Gestión de postulaciones y contactos (listado, detalle, estado, eliminación).
- Autenticación admin por credenciales.
- Recuperación de contraseña.
- Auditoría de acciones críticas.
- Control anti-abuso y rate limiting.

## 6. Out-of-Scope (versión actual)

- Multi-tenant.
- Roles jerárquicos avanzados.
- Workflow BPM completo de selección (etapas configurables por vacante).
- Facturación/contratación electrónica.
