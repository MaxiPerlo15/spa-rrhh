# Runtime Hygiene

## Objetivo

Reducir ruido técnico de runtime/build y documentar el camino de upgrade cuando queda algún warning pendiente.

## Estado de warnings (13 de febrero de 2026)

| Warning | Estado | Acción |
| --- | --- | --- |
| Next.js: convención `middleware` deprecada | Resuelto | Migrado `src/middleware.ts` a `src/proxy.ts` |
| Sentry: `disableLogger` deprecado | Resuelto | Reemplazado por `webpack.treeshake.removeDebugLogging` en `next.config.ts` |
| Sentry: `automaticVercelMonitors` deprecado | Resuelto | Reubicado a `webpack.automaticVercelMonitors` en `next.config.ts` |
| `baseline-browser-mapping` desactualizado | Pendiente | Requiere `npm i baseline-browser-mapping@latest -D` con acceso a red |

## Checklist operativo

1. Ejecutar `npm run build` y revisar warnings nuevos.
2. Ejecutar `npx tsc --noEmit` para validar strict typing.
3. Ejecutar `npm run lint` para degradaciones de calidad.
4. Registrar warnings no resueltos con causa y next step en este documento.

## Nota de entorno

En este entorno la actualización de `baseline-browser-mapping` falló por conectividad (`ENOTFOUND registry.npmjs.org`).  
Cuando haya red disponible, ejecutar:

```bash
npm i baseline-browser-mapping@latest -D
npm run build
```
