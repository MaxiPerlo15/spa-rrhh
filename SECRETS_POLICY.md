# Política de manejo de secrets y variables de entorno

## Checklist y buenas prácticas

- Nunca commitear `.env.local` ni ningún archivo con secrets reales.
- Usar `.env.example` para documentar todas las variables necesarias.
- Todas las variables sensibles deben estar en GitHub Secrets para CI/CD y producción.
- Rotar secrets sensibles (API keys, DB, Auth) cada 6-12 meses o ante sospecha de leak.
- Validar en el código la presencia de las variables requeridas y lanzar error si faltan.
- Para desarrollo, proveer valores de ejemplo en `.env.example` (sin datos reales).
- Documentar en README qué variables son obligatorias y cuáles opcionales.

## Variables requeridas

| Variable                | Descripción                | Dónde se define         | Fallback dev |
|-------------------------|----------------------------|------------------------|--------------|
| DATABASE_URL            | Conexión a base de datos   | .env.local, Secrets    | No           |
| NEXTAUTH_URL            | URL de la app (auth)       | .env.local, Secrets    | Sí (localhost) |
| NEXTAUTH_SECRET         | Secreto de sesión NextAuth | .env.local, Secrets    | No           |
| RESEND_API_KEY          | API Key de Resend          | .env.local, Secrets    | No           |
| UPLOADTHING_TOKEN       | Token de UploadThing       | .env.local, Secrets    | No           |

## Variables opcionales

| Variable                | Descripción                | Dónde se define         | Fallback dev |
|-------------------------|----------------------------|------------------------|--------------|
| NEXT_PUBLIC_SENTRY_DSN  | Sentry (frontend)          | .env.local, Secrets    | Sí (vacío)   |
| ADMIN_EMAIL             | Email admin (dev)          | .env.local, Secrets    | Sí           |
| ADMIN_PASSWORD          | Password admin (dev)       | .env.local, Secrets    | Sí           |
| NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE | Sentry tracing | .env.local, Secrets | Sí (0.1) |
| SENTRY_AUTH_TOKEN       | Sentry build plugin (CI)   | GitHub Secrets         | No           |

## Ejemplo de .env.example

Ver archivo `.env.example` en la raíz del proyecto.

## Rotación y seguridad
- Rotar secrets sensibles cada 6-12 meses o ante sospecha de leak.
- Eliminar secrets antiguos de GitHub Secrets tras la rotación.
- No compartir secrets por canales inseguros.
