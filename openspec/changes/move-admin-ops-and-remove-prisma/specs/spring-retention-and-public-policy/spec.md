# Delta for spring-retention-and-public-policy

## ADDED Requirements

### Requirement: Spring Retention and Public Policy

Spring MUST own audit and CV retention scheduling. Audit entries are security-retained for 180 days when outcome is `DENIED` or `ERROR`, or action starts `auth.`/`security.`; all others retain for 90 days. Concurrent purge runs MUST atomically select/delete only their classification and cutoff, so an entry is never double-counted or deleted by the wrong class.

CV retention MUST persist one work item per `(candidateId, expectedResumeKey)`. A worker atomically leases only due or expired-lease work; it calls storage with exactly `expectedResumeKey`, treating already-absent as success. It MUST clear `resumeKey`, URL, and filename only in a conditional write proving the current `resumeKey` still equals `expectedResumeKey`. A changed key marks the item `SUPERSEDED` without clearing metadata. Retryable errors record attempt/error and capped backoff; after five attempts or a non-retryable error the item is terminal `FAILED`. Expired leases are reclaimable, so a crash after remote deletion safely retries the same key. Dry runs MUST neither lease, delete, nor clear.

Spring MUST decide public form/upload rate-limit and captcha policy; Next MUST forward context/token, retain edge controls and browser responses, and MUST NOT retain policy decisions or Prisma fallbacks.

#### Scenario: Retention dry run
- GIVEN retention candidates exist
- WHEN a dry run executes
- THEN Spring reports candidates without creating work or deleting data

#### Scenario: Concurrent CV workers
- GIVEN two workers discover the same candidate and resume key
- WHEN they attempt to acquire work
- THEN exactly one holds the lease and only one conditional metadata clear can succeed

#### Scenario: Resume changes during deletion
- GIVEN storage deletion succeeds for `old-key` and the candidate now has `new-key`
- WHEN the worker completes
- THEN it marks `old-key` superseded and preserves the new resume metadata

#### Scenario: Retention worker crashes
- GIVEN a worker crashes after deleting `resumeKey` remotely
- WHEN its lease expires and another worker retries
- THEN the idempotent delete and exact-key compare complete safely

#### Scenario: Security audit retention
- GIVEN a 100-day-old `DENIED` audit event and a 100-day-old ordinary SUCCESS event
- WHEN retention runs
- THEN only the ordinary event is eligible for deletion

#### Scenario: Public policy denial
- GIVEN Spring rejects a request context or captcha token
- WHEN Next forwards the public request
- THEN Next returns the preserved rejection contract
