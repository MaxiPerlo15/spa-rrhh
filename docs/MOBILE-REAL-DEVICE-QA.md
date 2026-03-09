# Mobile Real-Device QA (MIS-120)

## Objetivo

Validar UX/UI y estabilidad funcional en dispositivos reales antes de deployment.

## Entornos objetivo

- iOS Safari (iPhone físico).
- Android Chrome (Android físico).

## Preparación

1. Levantar la app en modo producción local:
   - `npm run build`
   - `npm run start -- -p 3001`
2. Conectar ambos dispositivos a la misma red Wi-Fi.
3. Abrir en cada dispositivo:
   - `http://<IP_LOCAL>:3001`
4. Limpiar estado previo:
   - caché del navegador
   - cookies/sesión
   - local storage

## Checklist de ejecución

### A. Landing pública

- [ ] Navbar visible y sin solapamientos.
- [ ] Navegación a secciones por hash (`#inicio`, `#nosotros`, `#contacto`) sin saltos erráticos.
- [ ] CTA principal responde al toque y muestra feedback visual.
- [ ] Carrusel/animaciones sin trabas perceptibles.
- [ ] Banner de cookies visible y cerrable.

### B. Ofertas laborales

- [ ] Carga de listado sin recortes en cards.
- [ ] Filtros utilizables con teclado mobile.
- [ ] Scroll vertical fluido.
- [ ] Botón/flujo de postulación accesible desde card.

### C. Formularios públicos

- [ ] Contacto: validaciones claras y consistentes.
- [ ] Postulación: validaciones, adjunto CV y envío correcto.
- [ ] Estados loading/error/retry visibles cuando aplica.
- [ ] Mensajería de éxito sin ambigüedades.

### D. Admin mobile (header y navegación)

- [ ] Header fijo, sin cortar contenido.
- [ ] Botón notificaciones abre panel sin desbordes.
- [ ] Menú hamburguesa abre/cierra correctamente.
- [ ] Navegación entre módulos (`Vacantes`, `Postulaciones`, `Contactos`) sin recortes.
- [ ] Retorno desde `Configuración` funciona siempre.

### E. Admin mobile (operación)

- [ ] Vacantes: crear/editar/cerrar-activar/eliminar.
- [ ] Postulaciones: ver detalle y eliminar.
- [ ] Contactos: ver detalle y eliminar.
- [ ] Confirm dialogs legibles y accionables.
- [ ] Toasts visibles y no bloquean acciones críticas.

### F. Notificaciones

- [ ] Listado visible.
- [ ] Marcar como leída / no leída.
- [ ] Eliminar notificación individual.
- [ ] Limpiar leídas.
- [ ] CTA contextual navega al recurso esperado.

### G. Auth admin

- [ ] Sign in válido.
- [ ] Sign in inválido con mensaje correcto.
- [ ] Logout invalida sesión.
- [ ] Forgot/reset password (si hay token válido, validar end-to-end).

## Criterios de severidad

- **P0 (bloqueante):** impide operar flujo crítico.
- **P1 (alto):** flujo funciona con fricción seria o riesgo de error del usuario.
- **P2 (medio):** problema visual/UX relevante, con workaround.
- **P3 (bajo):** detalle cosmético menor.

## Regla de salida (Go/No-Go)

- Sin issues `P0`.
- Sin issues `P1` abiertos en flujos críticos.
- Evidencia mínima cargada para ambos dispositivos.

## Evidencia mínima obligatoria

- 1 captura por flujo crítico (landing, ofertas, admin header, notificaciones, CRUD básico).
- 1 video corto por dispositivo en flujo completo de admin.
- Reporte consolidado en `docs/MOBILE-REAL-DEVICE-REPORT.md`.
