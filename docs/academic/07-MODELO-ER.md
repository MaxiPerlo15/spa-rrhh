# 07. Modelo Entidad-Relación (ER)

## 1. Diagrama ER

```mermaid
erDiagram
  USER ||--o| ADMIN_SETTINGS : has
  USER ||--o{ PASSWORD_RESET_TOKEN : owns
  VACANCY ||--o{ APPLICATION : receives

  USER {
    string id PK
    string email UK
    string passwordHash
    enum role
    datetime createdAt
    datetime updatedAt
  }

  ADMIN_SETTINGS {
    string id PK
    string userId FK_UK
    bool notificationsEnabled
    bool notifyNewApplications
    bool notifyNewContacts
    bool notifySecurityAlerts
    datetime createdAt
    datetime updatedAt
  }

  PASSWORD_RESET_TOKEN {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
    datetime usedAt
    datetime createdAt
  }

  VACANCY {
    string id PK
    string title
    string description
    string location
    string salary
    string requirements
    string benefits
    enum status
    enum workday
    enum modality
    datetime createdAt
    datetime updatedAt
  }

  APPLICATION {
    string id PK
    string vacancyId FK
    string candidateName
    string email
    string phone
    string personKey
    string resumeFileName
    string resumeUrl
    string resumeKey
    string coverLetter
    enum status
    datetime submittedAt
    datetime updatedAt
  }

  CONTACT {
    string id PK
    string name
    string email
    string phone
    string personKey
    string subject
    string message
    enum status
    datetime createdAt
  }

  ADMIN_NOTIFICATION {
    string id PK
    string title
    string message
    enum level
    bool isRead
    string actionLabel
    enum actionType
    string actionResourceId
    datetime createdAt
    datetime updatedAt
  }

  ADMIN_AUDIT_LOG {
    string id PK
    string actorUserId
    string actorEmail
    string action
    string resourceType
    string resourceId
    enum outcome
    string ip
    string userAgent
    json metadata
    datetime createdAt
  }
```

## 2. Restricciones de integridad relevantes

- `User.email` único.
- `AdminSettings.userId` único (1:1 con User).
- `PasswordResetToken.tokenHash` único.
- `Application.vacancyId` FK con `onDelete: Cascade`.
- `personKey` para deduplicación temporal (aplicaciones y contactos).
