package com.meinardi.rrhh.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class CvRetentionServiceTest {
  private final CvRetentionWorkRepository repository = org.mockito.Mockito.mock(CvRetentionWorkRepository.class);
  private final CvRetentionService service = new CvRetentionService(repository);
  private final OffsetDateTime cutoff = OffsetDateTime.parse("2026-01-01T00:00:00Z");

  @Test
  void dryRunReportsCandidatesWithoutCreatingWork() {
    var candidate = new CandidateResume("candidate-1", "old-key");
    when(repository.findCandidates(cutoff)).thenReturn(List.of(candidate));

    assertThat(service.schedule(cutoff, true).candidates()).containsExactly(candidate);

    verify(repository, never()).enqueue(candidate, cutoff);
  }

  @Test
  void schedulingCreatesOnePendingItemPerCandidateAndExpectedKey() {
    var first = new CandidateResume("candidate-1", "key-1");
    var second = new CandidateResume("candidate-2", "key-2");
    when(repository.findCandidates(cutoff)).thenReturn(List.of(first, second));
    when(repository.enqueue(first, cutoff)).thenReturn(true);
    when(repository.enqueue(second, cutoff)).thenReturn(false);

    var result = service.schedule(cutoff, false);

    assertThat(result.created()).isEqualTo(1);
    verify(repository).enqueue(first, cutoff);
    verify(repository).enqueue(second, cutoff);
  }
}
