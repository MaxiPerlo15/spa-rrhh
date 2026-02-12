# QA Matrix (MIS-78)

## Objetivo

Validar flujos críticos en navegadores desktop y mobile con una matriz reproducible basada en Playwright.

## Cobertura de smoke tests

- Home: navbar, hero, CTAs y footer.
- Ofertas laborales: filtros y render de listado.
- Navegación hash desde footer (`/ofertas-laborales` -> `/#empresas`, `/#contacto`).
- Pantallas de autenticación admin (`/admin/signin`, `/admin/forgot-password`).

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

## Resultado (última ejecución)

Pendiente de completar en cada corrida con:

- Fecha/hora
- Proyectos ejecutados
- Pass/fail por navegador
- Bugs encontrados + issue de Linear asociado
