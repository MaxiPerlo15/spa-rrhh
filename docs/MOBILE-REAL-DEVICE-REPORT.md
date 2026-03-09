# Mobile Real-Device Report (MIS-120)

## Metadata

- Fecha: 2026-02-21 17:26:18 -03
- Tester: Maximiliano Perlo
- Build/commit: `fb7f92d`
- URL probada: `http://<IP_LOCAL>:3001`

## Dispositivos

- iOS:
  - Modelo: Pendiente (dispositivo físico)
  - Versión iOS: Pendiente
  - Navegador: Safari
- Android:
  - Modelo: Pendiente (dispositivo físico)
  - Versión Android: Pendiente
  - Navegador: Chrome

## Resultado general

- Estado: `FAIL`
- Resumen ejecutivo (máx. 5 líneas):
  - Subtarea técnica previa completada: filtros mobile de `/ofertas-laborales` migrados a sheet.
  - Gate técnico en verde: `test:unit`, `build`, `tsc`, `lint`.
  - QA en dispositivos físicos (iOS/Android) aún no ejecutado, por lo tanto no se puede emitir `Go`.
  - Política activa: `No-Go` con cualquier `P0/P1` crítico abierto.

## Hallazgos

| ID | Severidad | Dispositivo | Flujo | Descripción | Pasos para reproducir | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| MOB-120-BLK | P0 | iOS + Android | QA real-device | QA real-device no ejecutado aún en dispositivos físicos. Bloquea decisión de release de MIS-120. | 1) Levantar `npm run start -- -p 3001` 2) Probar en iPhone Safari y Android Chrome 3) Completar checklist A-G | Pendiente capturas/videos | Open |

## Checklist completado (real-device)

- [ ] Landing pública
- [ ] Ofertas laborales
- [ ] Formularios públicos
- [ ] Admin mobile (header y navegación)
- [ ] Admin mobile (operación)
- [ ] Notificaciones
- [ ] Auth admin

## Evidencia requerida (pendiente)

- [ ] Capturas iOS por bloques A-G
- [ ] Capturas Android por bloques A-G
- [ ] Video iOS flujo admin completo
- [ ] Video Android flujo admin completo

## Decisión de release

- Go / No-Go: `No-Go`
- Justificación:
  - Falta evidencia y ejecución completa de QA en dispositivos físicos.
  - No es posible cerrar MIS-120 sin validar criterios A-G en iOS Safari y Android Chrome reales.
- Condiciones para aprobar (si aplica):
  - Completar checklist A-G en ambos dispositivos.
  - Adjuntar evidencia completa (capturas + videos).
  - Resolver o planificar fixes para cualquier `P0/P1` detectado.
