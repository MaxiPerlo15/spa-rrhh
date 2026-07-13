# 05. Catálogo de Casos de Uso (CU)

## 1. Matriz de CU

| ID | Nombre | Actor Principal | Actor Secundario | Objetivo | Categoría |
|---|---|---|---|---|---|
| CU-001 | Consultar vacantes públicas | Candidato | Sistema | Visualizar vacantes activas | Consulta |
| CU-002 | Filtrar vacantes públicas | Candidato | Sistema | Encontrar vacantes relevantes | Consulta |
| CU-003 | Postular a vacante | Candidato | UploadThing, Turnstile, Resend | Registrar candidatura | Transacción |
| CU-004 | Enviar contacto | Candidato | Turnstile, Resend | Registrar consulta comercial | Transacción |
| CU-005 | Iniciar sesión admin | Administrador | NextAuth, Upstash | Obtener sesión válida | Seguridad |
| CU-006 | Recuperar contraseña | Administrador | Resend, Upstash | Restablecer acceso | Seguridad |
| CU-007 | Crear vacante | Administrador | Sistema | Alta de vacante | CRUD-ABCM |
| CU-008 | Consultar vacantes admin | Administrador | Sistema | Visualización operativa | CRUD-ABCM |
| CU-009 | Actualizar vacante | Administrador | Sistema | Modificar vacante | CRUD-ABCM |
| CU-010 | Eliminar vacante | Administrador | Sistema | Baja de vacante | CRUD-ABCM |
| CU-011 | Consultar postulaciones | Administrador | Sistema | Seguimiento de candidatos | CRUD-ABCM |
| CU-012 | Ver detalle postulación | Administrador | Sistema | Inspección de candidatura | CRUD-ABCM |
| CU-013 | Actualizar estado postulación | Administrador | Sistema | Avanzar flujo de selección | CRUD-ABCM |
| CU-014 | Eliminar postulación | Administrador | Sistema | Depurar registro | CRUD-ABCM |
| CU-015 | Consultar contactos | Administrador | Sistema | Gestionar consultas | CRUD-ABCM |
| CU-016 | Ver detalle contacto | Administrador | Sistema | Inspección de consulta | CRUD-ABCM |
| CU-017 | Actualizar estado contacto | Administrador | Sistema | Resolver consulta | CRUD-ABCM |
| CU-018 | Eliminar contacto | Administrador | Sistema | Depurar registro | CRUD-ABCM |
| CU-019 | Configurar preferencias admin | Administrador | Sistema | Ajustar notificaciones | Configuración |
| CU-020 | Gestionar notificaciones | Administrador | Sistema | Leer/marcar/eliminar notificaciones | Proceso automático |
| CU-021 | Consultar auditoría | Administrador | Sistema | Trazabilidad operativa | Reportería/Estadística |
| CU-022 | Ejecutar purga de auditoría | Proceso programado | Sistema | Cumplir retención | Proceso automático |
| CU-023 | Exportar postulaciones | Administrador | Sistema | Descargar postulaciones filtradas | Reportería/Estadística |
| CU-024 | Exportar candidatos | Administrador | Sistema | Descargar candidatos consolidados | Reportería/Estadística |

## 2. Diagrama General de CU

```mermaid
flowchart LR
  C[Candidato] --> CU1[CU-001/002 Vacantes]
  C --> CU3[CU-003 Postular]
  C --> CU4[CU-004 Contactar]

  A[Administrador] --> CU5[CU-005 Login]
  A --> CU6[CU-006 Reset Password]
  A --> CU7[CU-007..010 Gestión Vacantes]
  A --> CU11[CU-011..014 Gestión Postulaciones]
  A --> CU15[CU-015..018 Gestión Contactos]
  A --> CU19[CU-019 Configuración]
  A --> CU20[CU-020 Notificaciones]
  A --> CU21[CU-021 Auditoría]
  A --> CU23[CU-023 Exportar Postulaciones]
  A --> CU24[CU-024 Exportar Candidatos]

  CRON[Scheduler] --> CU22[CU-022 Purga Auditoría]
```

## 3. Clasificación solicitada de CU

### 3.1 Transacción
- CU-003, CU-004

### 3.2 Seguridad
- CU-005, CU-006

### 3.3 Reportería/Estadística
- CU-021, CU-023, CU-024

### 3.4 CRUD/ABCM (separados)
- Vacantes: CU-007 (Alta), CU-008 (Consulta), CU-009 (Modificación), CU-010 (Baja)
- Postulaciones: CU-011 (Consulta), CU-012 (Detalle), CU-013 (Modificación), CU-014 (Baja)
- Contactos: CU-015 (Consulta), CU-016 (Detalle), CU-017 (Modificación), CU-018 (Baja)

### 3.5 Procesos automáticos
- CU-020, CU-022

## 4. Especificación resumida de nuevos CU

### 4.1 CU-023 Exportar postulaciones

- Actor principal: `Administrador`
- Objetivo: descargar un archivo con las postulaciones visibles según filtros activos para análisis o respaldo externo.
- Precondiciones:
  - existe sesión admin válida
  - el administrador accede al módulo de postulaciones
- Flujo principal:
  1. el administrador filtra u ordena postulaciones
  2. selecciona la acción `Exportar CSV`
  3. el sistema recopila el conjunto filtrado
  4. el sistema genera el archivo descargable
  5. el sistema inicia la descarga
- Flujos alternativos:
  - si no hay registros filtrados, la acción permanece deshabilitada
  - si ocurre un error, el sistema informa que no pudo exportar
- Postcondición:
  - el administrador obtiene un archivo con el estado actual de las postulaciones exportadas

### 4.2 CU-024 Exportar candidatos

- Actor principal: `Administrador`
- Objetivo: descargar un archivo con candidatos consolidados, incluyendo contacto, CV y resumen de postulaciones.
- Precondiciones:
  - existe sesión admin válida
  - el administrador accede al módulo de candidatos
- Flujo principal:
  1. el administrador filtra candidatos por búsqueda textual
  2. selecciona la acción `Exportar CSV`
  3. el sistema consolida candidatos a partir de sus postulaciones asociadas
  4. el sistema genera el archivo descargable
  5. el sistema inicia la descarga
- Flujos alternativos:
  - si no hay candidatos visibles, la acción permanece deshabilitada
  - si ocurre un error, el sistema informa que no pudo exportar
- Postcondición:
  - el administrador obtiene un archivo con los candidatos visibles al momento de la exportación
