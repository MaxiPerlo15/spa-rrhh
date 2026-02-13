# Auth Architecture Audit (MIS-94)

Fecha: 13 de febrero de 2026

## 1) Arquitectura actual

### Proveedor y estrategia
- Framework: NextAuth (`Credentials` provider).
- Estrategia de sesión: `jwt`.
- Duración de sesión:
  - `maxAge`: 8 horas
  - `updateAge`: 1 hora

### Flujo de login
1. `POST` desde `src/app/admin/signin/page.tsx` usando `signIn('credentials')`.
2. Validación en `src/lib/auth.ts`:
   - busca usuario por email
   - valida `bcrypt.compare(password, passwordHash)`.
3. Si es válido, se emite JWT de sesión con `id` y `role`.
4. Middleware de protección en `src/proxy.ts` restringe rutas admin.

### Cookies y sesión
- Cookie de sesión `httpOnly`, `sameSite=lax`.
- En producción usa cookie segura (`__Secure-next-auth.session-token`) si está habilitado.
- Secret de firma: `NEXTAUTH_SECRET`.

### Recuperación de contraseña
- Endpoints:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- Token de recuperación:
  - se genera aleatorio
  - se guarda hasheado (`sha256`) en DB (`PasswordResetToken`)
  - expira por TTL (`PASSWORD_RESET_TOKEN_TTL_MINUTES`)
  - se invalida tras uso.

## 2) Controles de seguridad vigentes

- Rate limiting por IP (`src/lib/rateLimit.ts`) con soporte compartido via Upstash cuando está configurado.
- Anti-abuse de login/forgot/reset con guard de intentos:
  - `src/lib/authAttemptGuard.ts`
  - bloqueo progresivo temporal por identidad.
- Mensajes genéricos para reducir enumeración de usuarios.
- Reseteo de contraseña con validación de política y medidor de fortaleza en UI.

## 3) Riesgos residuales

1. No hay MFA para admin.
2. No hay invalidación activa de sesiones ya emitidas después de eventos críticos (ej. reset password) al nivel más estricto.
3. Observabilidad de seguridad aún depende mayormente de logs; falta dashboard y alertas operativas cerradas.
4. No hay allowlist de red para panel admin (opcional según modelo de amenaza).

## 4) Recomendaciones priorizadas

### Prioridad alta
1. MFA para cuentas admin (TOTP o WebAuthn).
2. Invalidate sessions on security events:
   - cambio de contraseña
   - reset de contraseña
   - sospecha de abuso.
3. Alertas automáticas:
   - picos de fallos login
   - picos de bloqueo
   - reset failures inusuales.

### Prioridad media
1. Auditoría persistente de acciones críticas admin (quién/cuándo/qué cambió).
2. Endurecer acceso al panel (allowlist IP/VPN según operación).

### Prioridad baja
1. Políticas adaptativas por riesgo (step-up auth).
2. Rotación periódica de secretos y revisión automatizada de configuración.

## 5) Estado de conclusión

- Se confirma que la autenticación actual es:
  - `Credentials` + JWT en NextAuth
  - recuperación por token one-time hasheado
  - controles anti-abuso activos.
- Se recomienda avanzar con MFA + alerting como próximos hitos para nivel de seguridad de producción.

