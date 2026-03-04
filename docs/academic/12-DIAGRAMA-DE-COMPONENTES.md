# 12. Diagrama de Componentes

```mermaid
flowchart TB
  subgraph UI
    P1[Landing Components]
    P2[Offers Components]
    P3[Admin Components]
    P4[Toast/Dialogs/Tutorial]
  end

  subgraph AppLogic
    L1[useAdminDashboard]
    L2[useMobileKeyboardAssist]
    L3[hashScroll]
  end

  subgraph Services
    S1[lib/api/vacancies]
    S2[lib/api/applications]
    S3[lib/api/contacts]
    S4[authAttemptGuard]
    S5[rateLimit]
    S6[passwordReset]
    S7[adminAudit]
  end

  subgraph API
    A1[/api/vacancies]
    A2[/api/applications]
    A3[/api/contacts]
    A4[/api/auth/*]
    A5[/api/admin/*]
    A6[/api/internal/audit-retention]
  end

  subgraph Infra
    I1[(Prisma/Neon)]
    I2[(Upstash)]
    I3[Resend]
    I4[UploadThing]
    I5[Turnstile]
    I6[Sentry]
  end

  UI --> AppLogic
  AppLogic --> Services
  Services --> API
  API --> Infra
```
