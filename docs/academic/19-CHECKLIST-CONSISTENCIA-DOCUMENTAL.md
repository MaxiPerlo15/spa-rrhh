# 19. Checklist de Consistencia Documental (Pre-Export)

## 1. Objetivo

Verificar consistencia interna del paquete académico antes de exportar a PDF y trasladar a `.drawio`.

## 2. Checklist de control

| ID | Control | Estado | Evidencia |
|---|---|---|---|
| CK-01 | Alcance definido (in/out scope) | OK | `01-ALCANCE-SISTEMA.md` |
| CK-02 | ERS conforme IEEE 29148 | OK | `02-ERS-IEEE-29148.md` |
| CK-03 | ARD con decisiones y drivers | OK | `03-ARD.md` |
| CK-04 | RF/RNF/RN identificados y numerados | OK | `04-RF-RNF-RN.md` |
| CK-05 | Catálogo de CU con IDs y actores | OK | `05-CASOS-DE-USO.md` |
| CK-06 | Fichas CU completas (pre/disparador/normal/alt/exc/post) | OK | `16-FICHAS-CU-IEEE-COMPLETAS.md` |
| CK-07 | Diagrama de realización de CU | OK | `06-CU-REALIZACION.md` |
| CK-08 | Modelo ER y restricciones clave | OK | `07-MODELO-ER.md` |
| CK-09 | Clases BCE con boundary/control/entity/pure-fabrication | OK | `08-DIAGRAMA-CLASES-BCE.md` |
| CK-10 | Flujos normal + alternativos por procesos | OK | `09-DIAGRAMAS-DE-FLUJO.md` |
| CK-11 | Máquinas de estado | OK | `10-MAQUINAS-DE-ESTADO.md` |
| CK-12 | Vistas arquitectónicas (funcional, lógica, global, despliegue) | OK | `11-VISTAS-ARQUITECTONICAS.md` |
| CK-13 | Diagrama de componentes | OK | `12-DIAGRAMA-DE-COMPONENTES.md` |
| CK-14 | Secuencias técnicas | OK | `13-DIAGRAMAS-DE-SECUENCIA.md` |
| CK-15 | Prototipos estructurales de interfaz | OK | `14-PROTOTIPOS-DE-INTERFAZ.md` |
| CK-16 | Diagrama flujo+secuencia por CU operativo | OK | `17-DIAGRAMAS-POR-CU-OPERATIVO.md` |
| CK-17 | Matriz RF↔RNF↔RN↔CU↔API↔Test | OK | `18-MATRIZ-TRAZABILIDAD-COMPLETA.md` |
| CK-18 | Numeración uniforme de figuras/tablas | OK | `17-*`, `18-*`, `03-*` |
| CK-19 | Referencias cruzadas normadas ERS/ARD | OK | `02-*`, `03-*` |

## 3. Hallazgos abiertos (no bloqueantes documentales)

- HB-01: Faltan tests de integración API exhaustivos por cada alternativo/excepción admin.
- HB-02: No existe paquete `.drawio` aún (pendiente etapa de maquetación visual).
- HB-03: Exportación PDF pendiente ejecución de toolchain local (`mmdc`/`pandoc` o equivalente).

## 4. Criterio de salida documental

Se considera “listo para exportación” cuando:
1. CK-01..CK-19 en OK.
2. Hallazgos HB-02 y HB-03 planificados con fechas/owner.
