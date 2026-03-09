# Dependency Policy (MIS-115)

## Objetivo

Mantener seguridad y estabilidad del proyecto con una cadencia predecible de upgrades y respuesta rápida ante vulnerabilidades críticas.

## Cadencia regular

- Ventana mensual fija: **primer lunes de cada mes**.
- Automatización de PRs: **Dependabot** (`npm` + `github-actions`).
- Alcance de la ventana regular:
  - updates `patch` y `minor` (agrupados cuando aplica),
  - revisión manual antes de merge.

## Política para versiones major

- No se hace auto-merge de updates `major`.
- Cada major se evalúa caso por caso en PR separado.
- Si implica riesgo alto (runtime/framework/auth/build), debe incluir validación reforzada y notas de compatibilidad.

## Vulnerabilidades críticas (fuera de ventana)

- Si aparece CVE crítica, se atiende de forma inmediata sin esperar la ventana mensual.
- La mitigación debe entrar por PR de hotfix con evidencia de validación.

## Validación obligatoria por PR de dependencias

Checklist mínimo:

1. `npm run lint`
2. `npm run test:unit`
3. `npm run test:coverage`
4. `npx playwright test tests/e2e/api-smoke.spec.ts`
5. `npm run build`

Validación reforzada (cuando el cambio es sensible):

1. `npm run test:e2e`

## Gate de seguridad en CI

- El workflow ejecuta `npm audit --audit-level=high`.
- Si hay vulnerabilidades `high` o `critical`, CI falla.
- No se mergea a `main` si `CI Success` no está verde.

