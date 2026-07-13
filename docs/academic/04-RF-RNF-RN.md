# 04. RF, RNF y Reglas de Negocio

## 1. Requisitos Funcionales (RF)

- RF-01: Consultar vacantes públicas activas.
- RF-02: Filtrar vacantes por jornada, modalidad y ubicación.
- RF-03: Postularse a una vacante con datos personales y CV.
- RF-04: Enviar consulta por formulario de contacto.
- RF-05: Iniciar sesión como administrador.
- RF-06: Recuperar contraseña de administrador.
- RF-07: Crear vacante.
- RF-08: Consultar vacantes en panel admin.
- RF-09: Actualizar vacante.
- RF-10: Cerrar/activar vacante.
- RF-11: Eliminar vacante.
- RF-12: Consultar postulaciones.
- RF-13: Ver detalle de postulación.
- RF-14: Actualizar estado de postulación.
- RF-15: Eliminar postulación.
- RF-16: Consultar contactos.
- RF-17: Ver detalle de contacto.
- RF-18: Actualizar estado de contacto.
- RF-19: Eliminar contacto.
- RF-20: Gestionar preferencias de notificaciones admin.
- RF-21: Consultar notificaciones admin.
- RF-22: Marcar notificaciones como leídas/no leídas.
- RF-23: Eliminar notificaciones.
- RF-24: Consultar log de auditoría.
- RF-25: Ejecutar purga de auditoría por retención.
- RF-26: Exportar postulaciones.
- RF-27: Exportar candidatos.

## 2. Requisitos No Funcionales (RNF)

- RNF-01 (Seguridad): autenticación obligatoria para endpoints admin.
- RNF-02 (Seguridad): políticas CSP y headers de seguridad activos.
- RNF-03 (Seguridad): anti-abuso con rate limit y lock por intentos.
- RNF-04 (Disponibilidad): comportamiento fail-closed en producción ante caída de store anti-abuso.
- RNF-05 (Mantenibilidad): arquitectura modular por capas.
- RNF-06 (Trazabilidad): auditoría persistente de acciones críticas.
- RNF-07 (Usabilidad): interfaz responsive mobile-first.
- RNF-08 (Calidad): pipeline CI con lint/build/unit/e2e.
- RNF-09 (Observabilidad): logging estructurado y monitoreo (Sentry).
- RNF-10 (Privacidad): minimización de datos y redacción de PII en logs.

## 3. Reglas de Negocio (RN)

- RN-01: Solo usuarios con rol `ADMIN` acceden al panel administrativo.
- RN-02: Vacantes públicas solo con estado `ACTIVE`.
- RN-03: Postulación duplicada en ventana corta se rechaza por `personKey` + vacante.
- RN-04: Contacto duplicado en ventana corta se rechaza por `personKey` + asunto.
- RN-05: Recuperación de contraseña usa token de un solo uso con expiración.
- RN-06: Acciones críticas admin deben auditarse.
- RN-07: Purga automática de auditoría según política de retención.
- RN-08: En producción, sin Upstash operativo no hay fallback inseguro a memoria para anti-abuso.
