# Admin Onboarding

## Objetivo

Reducir fricción para nuevos administradores mediante un tutorial inicial, ayuda contextual y reentrada voluntaria al flujo de guía.

## Implementación

1. Tutorial inicial de 4 pasos:
- Componente: `src/components/admin/AdminOnboardingDialog.tsx`
- Persistencia: `localStorage` con clave `admin_onboarding_completed_v1`

2. Ayuda contextual por pestaña:
- Componente: `src/components/admin/AdminContextHelp.tsx`
- Muestra sugerencias específicas para `vacancies`, `applications` y `contacts`

3. Reapertura manual del tutorial:
- Botón `Ayuda` en `src/components/admin/AdminHeader.tsx`
- Controlado desde `src/app/admin/page.tsx`

## Comportamiento

- Si es primer ingreso (sin clave en `localStorage`), el tutorial se abre automáticamente.
- Si el usuario cierra sin finalizar, se volverá a mostrar en próximos ingresos.
- Al finalizar tutorial, se guarda estado y se muestra toast de confirmación.

## UX

- Superficies no bloqueantes y recuperables.
- Mensajes breves y operativos.
- No interfiere con flujos críticos del panel.
