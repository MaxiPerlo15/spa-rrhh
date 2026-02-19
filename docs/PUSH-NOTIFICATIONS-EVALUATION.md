# Evaluación Push Notifications (MIS-96)

## Estado actual

Se implementó una base de notificaciones **in-app** en `/admin`:
- feed de eventos operativos en la pestaña **Configuración**
- contador de no leídas en header/tabs
- eventos desde acciones de gestión (vacantes/postulaciones/contactos)
- detección de incrementos de postulaciones/contactos pendientes

## Alcance de Web Push (navegador + mobile)

### Factibilidad

Web Push es viable para este proyecto con:
- `service worker` en frontend
- `Push API` + `Notifications API` en navegador
- backend con almacenamiento de suscripciones por admin
- proveedor de envío (`web-push` con VAPID o servicio externo)

### Requisitos técnicos

1. HTTPS obligatorio (en producción).
2. Pantalla de consentimiento explícito para permisos.
3. Endpoint para suscribir/desuscribir dispositivo.
4. Tabla para persistir suscripciones de admin (multi-dispositivo).
5. Job/event bus para disparar envíos en eventos críticos.

### Limitaciones conocidas

- iOS/Safari tiene restricciones y requiere instalación como web app en ciertos escenarios.
- Permisos denegados no se pueden re-preguntar sin acción del usuario en configuración del navegador.
- Debe evitarse spam de notificaciones para preservar tasa de habilitación.

## Propuesta de rollout incremental

1. Fase 1 (actual): notificaciones in-app (completado).
2. Fase 2: endpoint de suscripción + almacenamiento + botón “Activar notificaciones push”.
3. Fase 3: envíos push para eventos de alto valor:
   - nueva postulación
   - nuevo contacto pendiente
   - alerta de seguridad/auth (opcional)
4. Fase 4: preferencias por tipo de alerta y frecuencia.

## Recomendación

Mantener la capa in-app como baseline y avanzar Web Push solo para eventos críticos, con rate-limit y opt-in explícito.
