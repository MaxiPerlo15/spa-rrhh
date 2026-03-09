# Admin Onboarding

## Objetivo

Reducir fricción para nuevos administradores mediante un tutorial inicial, ayuda contextual y reentrada voluntaria al flujo de guía.

## Implementación

1. Onboarding unificador por módulos (Vacantes, Postulaciones, Contactos):
- Componente coachmark: `src/components/admin/AdminOnboardingDialog.tsx`
- Orquestación y targets: `src/app/admin/page.tsx`
- Cada paso del onboarding permite abrir el tutorial dedicado de ese módulo y luego volver al onboarding.

2. Tutoriales separados por dominio:
- Vacantes
- Postulaciones
- Contactos
- Cada tutorial guía targets reales del módulo y mantiene navegación `anterior/siguiente/finalizar`.
- Los pasos del tutorial pueden abrir automáticamente la UI vinculada al botón explicado para mostrar el flujo completo.

6. Cobertura guiada por módulo (MIS-90):
- Vacantes:
  - `+ Nueva Vacante`
  - Modal de alta/edición de vacante
  - Botones de primera fila: `Cerrar/Activar`, `Editar`, `Eliminar`
- Postulaciones:
  - Filtros y buscador
  - Botón `Ver` (abre panel de detalle)
  - Modal de detalle de postulación
  - Botón `CV` (cuando existe archivo)
- Contactos:
  - Tabla principal de contactos
  - Botón `Ver` (abre panel de detalle)
  - Modal de detalle de contacto

3. Spotlight con blur del resto de la UI:
- Overlay global con `backdrop-blur` sobre elementos no seleccionados.
- Elemento objetivo resaltado con anillo visual (`ring`) y prioridad de capa.

4. Ayuda contextual por pestaña:
- Componente: `src/components/admin/AdminContextHelp.tsx`
- Muestra sugerencias específicas para `vacancies`, `applications` y `contacts`

5. Reapertura manual del tutorial:
- Botón `Ayuda` en `src/components/admin/AdminHeader.tsx`
- Controlado desde `src/app/admin/page.tsx`

## Comportamiento

- Si es primer ingreso (sin clave en `localStorage`), el tutorial se abre automáticamente.
- Cada paso cambia de pestaña automáticamente para mantener visible el target del tour.
- El usuario puede entrar a tutoriales por separado y volver al onboarding en el punto donde estaba.
- Si el usuario cierra sin finalizar, se volverá a mostrar en próximos ingresos.
- Al finalizar tutorial, se guarda estado y se muestra toast de confirmación.

## UX

- Superficies no bloqueantes y recuperables.
- Mensajes breves y operativos.
- No interfiere con flujos críticos del panel.
