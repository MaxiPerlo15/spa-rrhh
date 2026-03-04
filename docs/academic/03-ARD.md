# 03. ARD (Architecture Requirements Document)

## 1. Objetivo

Definir la arquitectura objetivo y sus decisiones clave para satisfacer requisitos funcionales y atributos de calidad.

## 2. Drivers arquitectónicos

- Seguridad operacional del panel admin.
- Trazabilidad de acciones críticas.
- Mantenibilidad de código en evolución continua.
- Despliegue cloud-native con servicios administrados.

## 3. Decisiones arquitectónicas principales

- AD-01: Next.js App Router como plataforma full-stack.
- AD-02: Prisma ORM sobre PostgreSQL (Neon).
- AD-03: NextAuth Credentials para autenticación admin.
- AD-04: Upstash Redis para anti-abuso distribuido.
- AD-05: Fail-closed en producción cuando falla store anti-abuso.
- AD-06: Auditoría persistente de acciones críticas.
- AD-07: Integraciones desacopladas con proveedores externos (mail/files/captcha).

### Tabla 03-01. Mapeo de decisiones a drivers

| Decisión | Driver principal | Impacto |
|---|---|---|
| AD-01 | Mantenibilidad, despliegue | Unificación frontend/backend en un solo runtime |
| AD-02 | Consistencia de datos | Modelo relacional tipado y migraciones controladas |
| AD-03 | Seguridad de acceso | Control de sesión admin con JWT/cookies seguras |
| AD-04 | Seguridad anti-abuso | Estado distribuido entre instancias |
| AD-05 | Seguridad operativa | Evita bypass por fallback inseguro en producción |
| AD-06 | Trazabilidad | Auditoría de operaciones críticas |
| AD-07 | Desacoplamiento | Sustitución de proveedor con bajo impacto |

## 4. Estilos y patrones

- Arquitectura por capas (UI, aplicación, infraestructura).
- Boundary-Control-Entity para modelado de interacción.
- Servicios de creación pura para cross-cutting (rate-limit, logging, mail, captcha).

## 5. Vista de riesgos

- Riesgo R1: indisponibilidad proveedor externo (Upstash/Resend).
  - Mitigación: fail-closed controlado + logging + observabilidad.
- Riesgo R2: fuga de datos en logs.
  - Mitigación: redacción de PII + política de minimización.
- Riesgo R3: regresiones en flujos críticos por cambios UI.
  - Mitigación: E2E matrix + checklist QA mobile.

## 6. Restricciones arquitectónicas

- Cumplimiento de políticas CSP y cabeceras de seguridad.
- No exponer endpoints admin sin sesión válida.
- No fallback inseguro en producción para anti-abuso.

## 7. Vistas arquitectónicas relacionadas

Ver `/Users/maxiperlo/Coding/spa-rrhh/docs/academic/11-VISTAS-ARQUITECTONICAS.md` y `/Users/maxiperlo/Coding/spa-rrhh/docs/academic/12-DIAGRAMA-DE-COMPONENTES.md`.

## 8. Referencias cruzadas de arquitectura

- ARQ-01 (Contexto y contenedores): `11-VISTAS-ARQUITECTONICAS.md`
- ARQ-02 (Componentes): `12-DIAGRAMA-DE-COMPONENTES.md`
- ARQ-03 (Datos/ER): `07-MODELO-ER.md`
- ARQ-04 (Estados): `10-MAQUINAS-DE-ESTADO.md`
- ARQ-05 (Interacciones): `13-DIAGRAMAS-DE-SECUENCIA.md` y `17-DIAGRAMAS-POR-CU-OPERATIVO.md`
- ARQ-06 (Cumplimiento requisitos): `18-MATRIZ-TRAZABILIDAD-COMPLETA.md`
