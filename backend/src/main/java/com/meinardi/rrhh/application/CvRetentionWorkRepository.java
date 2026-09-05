package com.meinardi.rrhh.application;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface CvRetentionWorkRepository {
  List<CandidateResume> findCandidates(OffsetDateTime cutoff);

  boolean enqueue(CandidateResume candidate, OffsetDateTime nextAttemptAt);

  Optional<CvRetentionWorkItem> leaseNext(OffsetDateTime now, OffsetDateTime leaseUntil);

  Optional<CvRetentionCompletion> completeDeletion(CvRetentionWorkItem item, OffsetDateTime completedAt);

  void markRetry(CvRetentionWorkItem item, int attemptCount, OffsetDateTime nextAttemptAt, String error, OffsetDateTime updatedAt);

  void markFailed(CvRetentionWorkItem item, String error, OffsetDateTime updatedAt);
}
