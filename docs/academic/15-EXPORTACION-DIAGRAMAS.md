# 15. Exportación de Diagramas (PDF / Draw.io)

## 1. Fuente de verdad

La fuente canónica de diagramas es Mermaid en los documentos de `/docs/academic`.

## 2. Exportación a PDF

Opciones recomendadas:
- VS Code + extensión Markdown Preview Mermaid Support + imprimir a PDF.
- MkDocs/Docusaurus con plugin Mermaid y exportación PDF.
- Mermaid CLI (`mmdc`) para generar PNG/SVG y luego consolidar en PDF.

## 3. Exportación a Draw.io

No existe conversión 1:1 perfecta Mermaid -> Draw.io para todos los diagramas.
Se recomienda:

1. Tomar Mermaid como baseline semántica.
2. Reproducir en Draw.io por tipo de diagrama:
   - ER
   - Clases BCE
   - Componentes
   - Despliegue
   - Secuencia
   - Estados
3. Guardar cada archivo `.drawio` en `/docs/academic/drawio/`.

## 4. Control de cambios

- Toda modificación funcional primero se actualiza en Mermaid.
- Luego se sincroniza el equivalente en `.drawio`/`.pdf`.
