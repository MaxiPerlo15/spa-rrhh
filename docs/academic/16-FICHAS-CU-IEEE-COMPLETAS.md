# 16. Fichas de Casos de Uso (Formato IEEE)

## Convenciones

- Formato de flujo: curso principal, alternativos y excepciones.
- Cada CU referencia IDs definidos en `05-CASOS-DE-USO.md`.
- Pre/postcondiciones en términos de estado observable del sistema.

---

## CU-001 — Consultar vacantes públicas

- Objetivo: visualizar vacantes publicadas para candidatos.
- Actor principal: Candidato.
- Actor secundario: Sistema.
- Precondiciones:
  - Portal público disponible.
- Disparador:
  - Usuario ingresa a `/` o `/ofertas-laborales`.
- Curso principal:
  1. El sistema solicita vacantes públicas.
  2. El sistema responde vacantes en estado `ACTIVE`.
  3. El frontend renderiza cards/listado.
- Flujos alternativos:
  - A1: no hay vacantes activas → se muestra estado vacío.
- Excepciones:
  - E1: error de API/infraestructura → mensaje de error + opción de reintento.
- Postcondiciones:
  - Lista pública presentada o mensaje de indisponibilidad.

## CU-002 — Filtrar vacantes públicas

- Objetivo: acotar resultados por criterios laborales.
- Actor principal: Candidato.
- Actor secundario: Sistema.
- Precondiciones:
  - Vacantes públicas disponibles o endpoint accesible.
- Disparador:
  - Usuario aplica filtros de jornada/modalidad/ubicación o búsqueda textual.
- Curso principal:
  1. El usuario selecciona filtros.
  2. El sistema recalcula subconjunto.
  3. El sistema actualiza el listado visible.
- Flujos alternativos:
  - A1: combinación sin resultados → estado vacío filtrado.
  - A2: usuario limpia filtros → vuelve al conjunto base.
- Excepciones:
  - E1: error de carga durante filtrado server-side.
- Postcondiciones:
  - Listado consistente con filtros activos.

## CU-003 — Postular a vacante

- Objetivo: registrar candidatura con CV.
- Actor principal: Candidato.
- Actor secundario: UploadThing, Turnstile, Resend.
- Precondiciones:
  - Vacante disponible en vista pública.
  - Turnstile configurado.
- Disparador:
  - Usuario envía formulario de postulación.
- Curso principal:
  1. Usuario completa formulario y adjunta CV.
  2. Sistema valida campos.
  3. Sistema valida token anti-bot.
  4. Sistema evalúa anti-abuso/rate limit.
  5. Sistema valida duplicado por `personKey`.
  6. Sistema persiste `Application`.
  7. Sistema envía notificación por email al admin.
  8. Sistema responde confirmación.
- Flujos alternativos:
  - A1: sin CV (si no requerido por vacante) → continúa.
  - A2: fallback UI a reintento tras timeout.
- Excepciones:
  - E1: validación inválida (400).
  - E2: captcha inválido (400).
  - E3: bloqueado por anti-abuso (429).
  - E4: duplicado detectado (409).
  - E5: error de persistencia/email (500/503).
- Postcondiciones:
  - Candidatura registrada o rechazo controlado con motivo explícito.

## CU-004 — Enviar contacto

- Objetivo: registrar consulta comercial/contacto.
- Actor principal: Candidato/Visitante.
- Actor secundario: Turnstile, Resend.
- Precondiciones:
  - Página pública accesible.
- Disparador:
  - Usuario envía formulario de contacto.
- Curso principal:
  1. Usuario completa datos.
  2. Sistema valida payload.
  3. Sistema valida captcha.
  4. Sistema evalúa anti-abuso.
  5. Sistema valida duplicado por `personKey` y asunto.
  6. Sistema persiste `Contact`.
  7. Sistema notifica al admin.
  8. Sistema informa éxito.
- Flujos alternativos:
  - A1: contacto previamente respondido no aplica (alta nueva).
- Excepciones:
  - E1: payload inválido.
  - E2: captcha inválido.
  - E3: anti-abuso excedido.
  - E4: duplicado reciente.
  - E5: error interno.
- Postcondiciones:
  - Contacto persistido o rechazo con feedback.

## CU-005 — Iniciar sesión admin

- Objetivo: autenticar administrador y abrir panel.
- Actor principal: Administrador.
- Actor secundario: NextAuth, Upstash.
- Precondiciones:
  - Usuario admin existente.
  - Credenciales válidas.
- Disparador:
  - Usuario envía formulario de login.
- Curso principal:
  1. Sistema recibe email/password.
  2. Sistema evalúa lock por intentos.
  3. Sistema busca usuario admin.
  4. Sistema valida hash de contraseña.
  5. Sistema limpia contador de fallos.
  6. Sistema emite sesión JWT + cookies.
- Flujos alternativos:
  - A1: usuario ya autenticado → redirige a `/admin`.
- Excepciones:
  - E1: lock activo (AUTH_THROTTLED).
  - E2: credenciales inválidas.
  - E3: store anti-abuso no disponible en prod → fail-closed.
- Postcondiciones:
  - Sesión admin activa o intento denegado.

## CU-006 — Recuperar contraseña admin

- Objetivo: restablecer credencial admin mediante token temporal.
- Actor principal: Administrador.
- Actor secundario: Resend, Upstash.
- Precondiciones:
  - Email administrativo válido.
- Disparador:
  - Solicitud en `/admin/forgot-password` y posterior envío en `/admin/reset-password`.
- Curso principal:
  1. Usuario solicita recuperación.
  2. Sistema evalúa lock/rate limit.
  3. Sistema genera token de un solo uso (hash almacenado).
  4. Sistema envía email con link.
  5. Usuario abre link y define nueva contraseña.
  6. Sistema valida token y fortaleza de contraseña.
  7. Sistema actualiza hash en `User`.
  8. Sistema invalida tokens activos del usuario.
- Flujos alternativos:
  - A1: identidad desconocida → respuesta genérica anti-enumeración.
- Excepciones:
  - E1: lock/rate-limit.
  - E2: envío de email fallido.
  - E3: token inválido/expirado/usado.
- Postcondiciones:
  - Contraseña renovada o flujo abortado con causa.

## CU-007 — Alta de vacante

- Objetivo: crear una vacante en panel admin.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión admin válida.
- Disparador:
  - Admin confirma formulario “Nueva vacante”.
- Curso principal:
  1. Sistema valida datos de vacante.
  2. Sistema persiste `Vacancy`.
  3. Sistema registra auditoría `vacancy.create`.
  4. Sistema actualiza UI.
- Flujos alternativos:
  - A1: creación en estado `DRAFT`.
- Excepciones:
  - E1: validación inválida.
  - E2: error de persistencia.
- Postcondiciones:
  - Vacante creada y visible en módulo.

## CU-008 — Consulta de vacantes admin

- Objetivo: visualizar listado operativo completo de vacantes.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión admin válida.
- Disparador:
  - Ingreso al módulo de vacantes.
- Curso principal:
  1. Sistema solicita `/api/vacancies?all=1`.
  2. Sistema devuelve vacantes de todos los estados.
  3. UI aplica filtros y orden.
- Flujos alternativos:
  - A1: sin resultados por filtros.
- Excepciones:
  - E1: sesión expirada/no autorizada.
- Postcondiciones:
  - Listado operativo mostrado.

## CU-009 — Modificación de vacante

- Objetivo: editar campos de vacante.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Vacante existente.
- Disparador:
  - Admin confirma edición.
- Curso principal:
  1. Sistema valida payload.
  2. Sistema actualiza `Vacancy`.
  3. Sistema audita `vacancy.update`.
  4. Sistema refleja cambios.
- Flujos alternativos:
  - A1: edición parcial solo de un subconjunto.
- Excepciones:
  - E1: vacante inexistente.
  - E2: validación inválida.
- Postcondiciones:
  - Vacante actualizada.

## CU-010 — Baja de vacante

- Objetivo: eliminar vacante existente.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Confirmación explícita del diálogo.
- Disparador:
  - Admin confirma eliminación.
- Curso principal:
  1. Sistema elimina `Vacancy`.
  2. Sistema audita `vacancy.delete`.
  3. UI remueve el registro.
- Flujos alternativos:
  - A1: cancelación de diálogo.
- Excepciones:
  - E1: vacante inexistente.
  - E2: error de persistencia.
- Postcondiciones:
  - Vacante eliminada.

## CU-011 — Consulta de postulaciones

- Objetivo: visualizar postulaciones recibidas.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Ingreso al módulo Postulaciones.
- Curso principal:
  1. Sistema consulta endpoint de listado.
  2. Sistema presenta tabla/cards con filtros.
- Flujos alternativos:
  - A1: estado vacío.
- Excepciones:
  - E1: no autorizado.
- Postcondiciones:
  - Postulaciones visibles para gestión.

## CU-012 — Ver detalle de postulación

- Objetivo: inspeccionar datos completos de una postulación.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Postulación existente.
- Disparador:
  - Click en acción “Ver”.
- Curso principal:
  1. Sistema consulta detalle por id.
  2. Sistema muestra diálogo de detalle.
- Flujos alternativos:
  - A1: abrir CV en nueva pestaña cuando existe `resumeUrl`.
- Excepciones:
  - E1: registro inexistente.
- Postcondiciones:
  - Información completa disponible para decisión.

## CU-013 — Modificación de estado de postulación

- Objetivo: mover candidatura entre estados de proceso.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Postulación existente.
- Disparador:
  - Selección de nuevo estado.
- Curso principal:
  1. Sistema valida transición solicitada.
  2. Sistema actualiza `Application.status`.
  3. Sistema audita `application.update_status`.
- Flujos alternativos:
  - A1: mismo estado seleccionado → no-op.
- Excepciones:
  - E1: estado inválido.
- Postcondiciones:
  - Estado actualizado y trazado.

## CU-014 — Baja de postulación

- Objetivo: eliminar postulación del panel.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Confirmación explícita.
- Disparador:
  - Acción “Eliminar”.
- Curso principal:
  1. Sistema elimina registro.
  2. Sistema audita `application.delete`.
  3. UI actualiza listado.
- Flujos alternativos:
  - A1: cancelación.
- Excepciones:
  - E1: inexistencia de registro.
- Postcondiciones:
  - Registro eliminado.

## CU-015 — Consulta de contactos

- Objetivo: visualizar consultas recibidas.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Ingreso al módulo Contactos.
- Curso principal:
  1. Sistema lista contactos.
  2. UI permite filtros/orden.
- Flujos alternativos:
  - A1: sin resultados.
- Excepciones:
  - E1: error de autorización o servidor.
- Postcondiciones:
  - Contactos disponibles para tratamiento.

## CU-016 — Ver detalle de contacto

- Objetivo: inspeccionar mensaje completo de contacto.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Contacto existente.
- Disparador:
  - Acción “Ver”.
- Curso principal:
  1. Sistema consulta contacto por id.
  2. Sistema presenta diálogo de detalle.
- Flujos alternativos:
  - A1: detalle ya en cache UI.
- Excepciones:
  - E1: contacto inexistente.
- Postcondiciones:
  - Información del contacto disponible.

## CU-017 — Modificación de estado de contacto

- Objetivo: actualizar ciclo de atención del contacto.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Cambio de estado por selector.
- Curso principal:
  1. Sistema valida estado destino.
  2. Sistema actualiza `Contact.status`.
  3. Sistema audita `contact.update_status`.
- Flujos alternativos:
  - A1: estado no cambia.
- Excepciones:
  - E1: estado inválido.
- Postcondiciones:
  - Estado persistido.

## CU-018 — Baja de contacto

- Objetivo: eliminar contacto.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
  - Confirmación explícita.
- Disparador:
  - Acción “Eliminar”.
- Curso principal:
  1. Sistema elimina `Contact`.
  2. Sistema audita `contact.delete`.
  3. UI refleja baja.
- Flujos alternativos:
  - A1: cancelación.
- Excepciones:
  - E1: contacto inexistente.
- Postcondiciones:
  - Registro eliminado.

## CU-019 — Configurar preferencias admin

- Objetivo: administrar flags de notificaciones del panel.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Acción “Guardar configuración”.
- Curso principal:
  1. Sistema recupera settings actuales.
  2. Admin cambia switches.
  3. Sistema persiste `AdminSettings`.
- Flujos alternativos:
  - A1: primera vez sin registro previo → crea `AdminSettings`.
- Excepciones:
  - E1: sesión inválida.
  - E2: payload inválido.
- Postcondiciones:
  - Configuración actualizada.

## CU-020 — Gestionar notificaciones admin

- Objetivo: consumir y mantener bandeja de notificaciones internas.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Apertura panel de notificaciones y acciones sobre ítems.
- Curso principal:
  1. Sistema lista notificaciones.
  2. Admin marca leída/no leída.
  3. Admin elimina notificación o limpia leídas.
  4. Sistema persiste cambios.
- Flujos alternativos:
  - A1: sin notificaciones (estado vacío).
- Excepciones:
  - E1: notificación inexistente al actualizar/borrar.
- Postcondiciones:
  - Bandeja consistente con operaciones.

## CU-021 — Consultar auditoría

- Objetivo: revisar trazabilidad de acciones críticas.
- Actor principal: Administrador.
- Actor secundario: Sistema.
- Precondiciones:
  - Sesión válida.
- Disparador:
  - Acceso a sección de auditoría con filtros.
- Curso principal:
  1. Sistema recibe filtros (`actorEmail`, `action`, `resourceType`, `dateFrom`, `dateTo`).
  2. Sistema consulta `AdminAuditLog`.
  3. Sistema devuelve timeline paginada.
- Flujos alternativos:
  - A1: filtros vacíos → vista global reciente.
- Excepciones:
  - E1: sesión inválida.
- Postcondiciones:
  - Timeline auditada disponible para inspección.

## CU-022 — Ejecutar purga de auditoría

- Objetivo: eliminar registros vencidos por política de retención.
- Actor principal: Proceso programado.
- Actor secundario: Sistema.
- Precondiciones:
  - Secret de cron válido.
  - Endpoint interno accesible.
- Disparador:
  - Job invoca `/api/internal/audit-retention`.
- Curso principal:
  1. Sistema valida secreto.
  2. Sistema evalúa criticidad del log.
  3. Sistema aplica retención (90/180 días).
  4. Sistema elimina registros expirados.
  5. Sistema retorna resumen de purga.
- Flujos alternativos:
  - A1: no hay registros vencidos.
- Excepciones:
  - E1: secreto inválido (401/403).
  - E2: error de DB.
- Postcondiciones:
  - Base de auditoría alineada a política vigente.
