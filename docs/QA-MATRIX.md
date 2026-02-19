# QA Matrix (MIS-99)

## Objetivo

Validar flujos críticos de navegación pública + autenticación/recuperación en navegadores desktop y mobile con una matriz reproducible basada en Playwright.

## Cobertura de smoke tests

- Home: navbar, hero, CTAs y footer.
- Ofertas laborales: filtros y render de listado.
- Navegación hash desde footer (`/ofertas-laborales` -> `/#empresas`, `/#contacto`).
- Pantallas de autenticación admin (`/admin/signin`, `/admin/forgot-password`).
- Login con credenciales inválidas.
- Forgot password: feedback de éxito controlado.
- Reset password: validación de token faltante.

## Validación manual complementaria (auth hardening)

- Throttling por intentos fallidos en login (5+ intentos).
- Forgot/reset con límite de requests por IP y mensajes de bloqueo temporal.
- Evidencia: captura + timestamp + navegador/dispositivo.

## Matriz objetivo

- Desktop Chrome (`chromium`)
- Desktop Firefox (`firefox`)
- Desktop Safari (`webkit`)
- Mobile Chrome (`mobile-chrome`, Pixel 5)
- Mobile Safari (`mobile-safari`, iPhone 12)

## Comando

```bash
npm run test:e2e:matrix
```

## Criterios de salida

- `PASS` en los 5 proyectos (`chromium`, `firefox`, `webkit`, `mobile-chrome`, `mobile-safari`).
- Cero fallos en flujos auth críticos:
  - invalid credentials
  - pantalla forgot password
  - pantalla reset password
- Validación manual documentada para:
  - bloqueo temporal por intentos
  - límites de abuse/rate-limit en forgot/reset
- Si falla un navegador, registrar issue en Linear con:
  - navegador/dispositivo
  - test fallido
  - evidencia (`playwright-report` / screenshot / trace)

## Resultado (última ejecución)

Completar en cada corrida con:

- Fecha/hora
- Proyectos ejecutados
- Pass/fail por navegador
- Bugs encontrados + issue de Linear asociado
