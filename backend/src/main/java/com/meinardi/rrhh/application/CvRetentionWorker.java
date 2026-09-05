package com.meinardi.rrhh.application;

import java.time.OffsetDateTime;
import java.util.Optional;

public class CvRetentionWorker {
  private static final int MAX_ATTEMPTS = 5;
  private static final long LEASE_SECONDS = 300;
  private static final long MAX_BACKOFF_SECONDS = 3600;

  private final CvRetentionWorkRepository repository;
  private final ResumeStorage storage;

  public enum Status { NO_WORK, SUCCEEDED, SUPERSEDED, LEASE_LOST, RETRY_WAIT, FAILED }
  public record ProcessResult(Status status, String workItemId) {}

  public CvRetentionWorker(CvRetentionWorkRepository repository, ResumeStorage storage) {
    this.repository = repository;
    this.storage = storage;
  }

  public ProcessResult processNext(OffsetDateTime now) {
    Optional<CvRetentionWorkItem> leased = repository.leaseNext(now, now.plusSeconds(LEASE_SECONDS));
    if (leased.isEmpty()) return new ProcessResult(Status.NO_WORK, null);
    CvRetentionWorkItem item = leased.get();

    try {
      storage.delete(item.expectedResumeKey());
      return completionResult(repository.completeDeletion(item, now), item.id());
    } catch (ResumeObjectNotFoundException absent) {
      return completionResult(repository.completeDeletion(item, now), item.id());
    } catch (ResumeStorageException failure) {
      return recordFailure(item, failure.getMessage(), failure.isRetryable(), now);
    } catch (RuntimeException failure) {
      return recordFailure(item, message(failure), false, now);
    }
  }

  private ProcessResult completionResult(Optional<CvRetentionCompletion> completion, String workItemId) {
    return new ProcessResult(
        completion.map(value -> Status.valueOf(value.name())).orElse(Status.LEASE_LOST), workItemId);
  }

  private ProcessResult recordFailure(CvRetentionWorkItem item, String error, boolean retryable, OffsetDateTime now) {
    if (retryable && item.attemptCount() < MAX_ATTEMPTS) {
      long backoff = Math.min(MAX_BACKOFF_SECONDS, 1L << (item.attemptCount() + 2));
      repository.markRetry(item, item.attemptCount(), now.plusSeconds(backoff), error, now);
      return new ProcessResult(Status.RETRY_WAIT, item.id());
    }
    repository.markFailed(item, error, now);
    return new ProcessResult(Status.FAILED, item.id());
  }

  private String message(RuntimeException failure) {
    return failure.getMessage() == null ? failure.getClass().getSimpleName() : failure.getMessage();
  }
}
