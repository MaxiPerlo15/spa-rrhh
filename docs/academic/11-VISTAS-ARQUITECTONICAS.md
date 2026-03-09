# 11. Vistas Arquitectónicas

## 1. Vista Funcional

- Subsistema público: landing, ofertas, formularios.
- Subsistema admin: autenticación, gestión operativa, auditoría.
- Subsistema transversal: seguridad, anti-abuso, observabilidad.

## 2. Vista Lógica (C4 - Container)

```mermaid
flowchart LR
  U1[Usuario Público] --> WEB[Next.js Web App]
  U2[Administrador] --> WEB

  WEB --> API[Next.js API Routes]
  API --> DB[(PostgreSQL Neon)]
  API --> REDIS[(Upstash Redis)]
  API --> MAIL[Resend API]
  API --> FILE[UploadThing API]
  API --> BOT[Cloudflare Turnstile]
  API --> MON[Sentry]
```

## 3. Vista de Diseño (Componentes internos)

- `src/app` (presentación/rutas)
- `src/components` (UI reusable)
- `src/hooks` (lógica de interacción)
- `src/lib` (servicios, seguridad, validaciones)
- `src/app/api` (adaptadores HTTP)
- `prisma` (modelo de datos y migraciones)

## 4. Vista de Diseño Global

```mermaid
flowchart TB
  subgraph Frontend
    A[Landing]
    B[Ofertas]
    C[Admin UI]
  end

  subgraph Backend
    D[API Vacancies]
    E[API Applications]
    F[API Contacts]
    G[API Auth]
    H[API Notifications]
    I[API Audit]
  end

  subgraph Infra
    J[(Neon DB)]
    K[(Upstash Redis)]
    L[Resend]
    M[UploadThing]
    N[Turnstile]
    O[Sentry]
  end

  A --> D
  B --> D
  B --> E
  A --> F
  C --> D
  C --> E
  C --> F
  C --> G
  C --> H
  C --> I

  D --> J
  E --> J
  F --> J
  G --> J
  H --> J
  I --> J

  E --> K
  F --> K
  G --> K
  E --> L
  F --> L
  E --> M
  E --> N
  F --> N

  D --> O
  E --> O
  F --> O
  G --> O
```

## 5. Vista de Despliegue

```mermaid
flowchart LR
  Browser --> CDN[Vercel Edge/CDN]
  CDN --> App[Vercel Next.js Runtime]
  App --> Neon[(Neon PostgreSQL)]
  App --> Upstash[(Upstash Redis)]
  App --> Resend[Resend]
  App --> UploadThing[UploadThing]
  App --> Turnstile[Cloudflare Turnstile]
  App --> Sentry[Sentry]
```
