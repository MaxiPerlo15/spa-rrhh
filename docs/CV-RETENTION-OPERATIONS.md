# Retención de CVs (180 días)

## Política activa
- Retención por defecto: `180` días (`CV_RETENTION_DAYS`).
- Se elimina archivo CV + metadata de CV en `Application`.
- La postulación se conserva para histórico y métricas.

## Endpoint interno
- `POST /api/internal/cv-retention`
- Autorización:
  - `Authorization: Bearer <CV_RETENTION_CRON_SECRET>` o
  - `x-cron-secret: <CV_RETENTION_CRON_SECRET>`

## Variables de entorno
- `CV_RETENTION_CRON_SECRET` (obligatoria en producción)
- `CV_RETENTION_DAYS` (opcional, default `180`)
- `UPLOADTHING_TOKEN` (si falta, se limpia metadata pero se marca skip de borrado remoto)

## Script manual
```bash
npm run cv:purge
```

Variables del script:
- `CV_RETENTION_PURGE_ENDPOINT` (default `http://localhost:3000/api/internal/cv-retention`)
- `CV_RETENTION_CRON_SECRET`

## Frecuencia recomendada
- Diario, por ejemplo `03:15` (cron scheduler de infraestructura).
