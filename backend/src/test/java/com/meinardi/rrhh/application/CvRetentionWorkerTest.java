package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class CvRetentionWorkerTest {
  private final CvRetentionWorkRepository repository = org.mockito.Mockito.mock(CvRetentionWorkRepository.class);
  private final ResumeStorage storage = org.mockito.Mockito.mock(ResumeStorage.class);
  private final CvRetentionWorker worker = new CvRetentionWorker(repository, storage);
  private final OffsetDateTime now = OffsetDateTime.parse("2026-09-05T10:00:00Z");

  @Test
  void deletesTheLeasedExactKeyAndClearsMetadataOnlyWhenItStillMatches() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("old-key", 1)));
    when(repository.completeDeletion(any(), eq(now))).thenReturn(Optional.of(CvRetentionCompletion.SUCCEEDED));

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.SUCCEEDED);

    verify(storage).delete("old-key");
    verify(repository).completeDeletion(item("old-key", 1), now);
  }

  @Test
  void marksTheWorkSupersededWhenTheCandidateKeyChangedDuringDeletion() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("old-key", 1)));
    when(repository.completeDeletion(any(), eq(now))).thenReturn(Optional.of(CvRetentionCompletion.SUPERSEDED));

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.SUPERSEDED);

    verify(storage).delete("old-key");
    verify(repository).completeDeletion(item("old-key", 1), now);
  }

  @Test
  void treatsAnAbsentStorageObjectAsAnIdempotentSuccess() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("missing-key", 2)));
    org.mockito.Mockito.doThrow(new ResumeObjectNotFoundException("missing-key")).when(storage).delete("missing-key");
    when(repository.completeDeletion(any(), eq(now))).thenReturn(Optional.of(CvRetentionCompletion.SUCCEEDED));

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.SUCCEEDED);
    verify(repository).completeDeletion(item("missing-key", 2), now);
  }

  @Test
  void retriesRetryableFailuresWithCappedBackoffAndFailsOnTheFifthAttempt() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("retry-key", 2)));
    org.mockito.Mockito.doThrow(new ResumeStorageException("temporary", true)).when(storage).delete("retry-key");

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.RETRY_WAIT);

    ArgumentCaptor<OffsetDateTime> nextAttempt = ArgumentCaptor.forClass(OffsetDateTime.class);
    verify(repository).markRetry(eq(item("retry-key", 2)), eq(2), nextAttempt.capture(), eq("temporary"), eq(now));
    assertThat(nextAttempt.getValue()).isEqualTo(now.plusSeconds(16));

    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("retry-key", 5)));
    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.FAILED);
    verify(repository).markFailed(item("retry-key", 5), "temporary", now);
  }

  @Test
  void failsImmediatelyForNonRetryableStorageErrors() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("bad-key", 1)));
    org.mockito.Mockito.doThrow(new ResumeStorageException("permanent", false)).when(storage).delete("bad-key");

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.FAILED);
    verify(repository).markFailed(item("bad-key", 1), "permanent", now);
  }

  @Test
  void doesNotCompleteAWorkItemAfterItsLeaseWasReclaimed() {
    when(repository.leaseNext(eq(now), any())).thenReturn(Optional.of(item("stale-key", 1)));
    when(repository.completeDeletion(any(), eq(now))).thenReturn(Optional.empty());

    assertThat(worker.processNext(now).status()).isEqualTo(CvRetentionWorker.Status.LEASE_LOST);
  }

  private CvRetentionWorkItem item(String key, int attempt) {
    return new CvRetentionWorkItem("work-1", "candidate-1", key, attempt, "lease-1");
  }
}
