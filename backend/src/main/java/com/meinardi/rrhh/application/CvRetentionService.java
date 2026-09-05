package com.meinardi.rrhh.application;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CvRetentionService {
  private final CvRetentionWorkRepository repository;

  public CvRetentionService(CvRetentionWorkRepository repository) {
    this.repository = repository;
  }

  public record ScheduleResult(List<CandidateResume> candidates, int created) {}

  @Transactional
  public ScheduleResult schedule(OffsetDateTime cutoff, boolean dryRun) {
    List<CandidateResume> candidates = repository.findCandidates(cutoff);
    if (dryRun) return new ScheduleResult(candidates, 0);

    int created = 0;
    for (CandidateResume candidate : candidates) {
      if (repository.enqueue(candidate, cutoff)) created++;
    }
    return new ScheduleResult(candidates, created);
  }
}
