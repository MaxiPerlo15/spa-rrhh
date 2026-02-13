# Cookie Strategy

## Fecha

13 de febrero de 2026

## Objetivo

Definir una estrategia de cookies proporcional al uso real del proyecto `spa-rrhh` y evitar banners complejos sin valor legal/técnico actual.

## Inventario actual

### Cookies esenciales (actuales)

1. `__Secure-next-auth.session-token` / `next-auth.session-token`
- Uso: mantener sesión autenticada de administradores.
- Origen: NextAuth (`src/lib/auth.ts`).

2. `next-auth.csrf-token`
- Uso: protección CSRF en autenticación.
- Origen: NextAuth.

3. `next-auth.callback-url`
- Uso: conservar URL de retorno en flujo de login.
- Origen: NextAuth.

### Cookies no esenciales (actualmente ausentes)

- Analytics
- Marketing
- Perfilado
- Retargeting

No se detectaron integraciones activas de analítica/marketing que requieran consentimiento granular.

## Decisión de estrategia

### Presente (implementado en MIS-88)

1. Aviso liviano de cookies esenciales en frontend (`CookieNotice`).
2. Política de privacidad con tabla explícita de cookies y finalidad.
3. Sin centro de preferencias granular, porque no hay categorías no esenciales activas.

### Futuro (si se agregan analíticas/marketing)

Antes de activar cualquier cookie no esencial, implementar:

1. Banner con categorías (`esencial`, `analítica`, `marketing`).
2. Opción explícita de aceptar/rechazar no esenciales.
3. Carga condicional de scripts según consentimiento.

## Justificación

Esta estrategia cumple el criterio de minimización y transparencia:

- informa al usuario sobre cookies realmente usadas,
- evita fricción innecesaria cuando no existen cookies de marketing,
- deja preparado el camino para consentimiento granular si cambia el stack.
