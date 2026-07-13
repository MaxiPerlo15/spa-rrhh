# RRHH Backend (Spring Boot)

## Run with Docker

```bash
docker compose -f docker-compose.backend.yml up --build
```

## Local run (requires Maven)

```bash
cd backend
SPRING_PROFILES_ACTIVE=local mvn spring-boot:run
```

The default session cookie is secure. The explicit `local` profile is the only
configuration that permits an insecure cookie for HTTP localhost development.

## Current scope

- Base Spring Boot project
- Initial domain model classes based on UML
- PostgreSQL connectivity configuration
