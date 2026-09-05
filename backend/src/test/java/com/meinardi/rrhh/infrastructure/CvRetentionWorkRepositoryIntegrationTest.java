package com.meinardi.rrhh.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.meinardi.rrhh.application.CandidateResume;
import com.meinardi.rrhh.application.CvRetentionCompletion;
import com.meinardi.rrhh.application.CvRetentionWorkItem;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CyclicBarrier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate", "spring.datasource.driver-class-name=org.postgresql.Driver", "rrhh.security.internal-api-token=test-token"})
class CvRetentionWorkRepositoryIntegrationTest {
  private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
  static { POSTGRES.start(); }

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
  }

  @Autowired private JdbcTemplate jdbc;
  @Autowired private JdbcCvRetentionWorkRepository repository;
  private final OffsetDateTime now = OffsetDateTime.parse("2026-09-05T10:00:00Z");

  @BeforeEach
  void clear() {
    jdbc.update("DELETE FROM cv_retention_work_item");
    jdbc.update("DELETE FROM postulacion WHERE candidato_id LIKE 'retention-%'");
    jdbc.update("DELETE FROM candidato WHERE id LIKE 'retention-%'");
  }

  @Test
  void findsOnlyCandidatesWhoseApplicationsArePastRetentionCutoff() {
    insertCandidate("retention-eligible", "eligible-key");
    insertCandidate("retention-active", "active-key");
    insertApplication("application-old", "retention-eligible", now.minusDays(100));
    insertApplication("application-old-active", "retention-active", now.minusDays(100));
    insertApplication("application-new-active", "retention-active", now.minusDays(1));

    assertThat(repository.findCandidates(now.minusDays(90)))
        .containsExactly(new CandidateResume("retention-eligible", "eligible-key"));
  }

  @Test
  void concurrentWorkersCanLeaseOnlyOneDueWorkItem() throws Exception {
    insertCandidate("retention-1", "old-key");
    assertThat(repository.enqueue(new CandidateResume("retention-1", "old-key"), now)).isTrue();
    CyclicBarrier ready = new CyclicBarrier(2);
    ExecutorService workers = Executors.newFixedThreadPool(2);
    try {
      Callable<java.util.Optional<CvRetentionWorkItem>> lease = () -> {
        ready.await();
        return repository.leaseNext(now, now.plusMinutes(5));
      };
      List<Future<java.util.Optional<CvRetentionWorkItem>>> results = workers.invokeAll(List.of(lease, lease));

      long leased = 0;
      for (Future<java.util.Optional<CvRetentionWorkItem>> result : results) {
        if (result.get().isPresent()) leased++;
      }
      assertThat(leased).isEqualTo(1);
    } finally {
      workers.shutdownNow();
      workers.awaitTermination(5, TimeUnit.SECONDS);
    }
  }

  @Test
  void conditionalCompletionPreservesNewResumeMetadataWhenTheKeyWasReplaced() {
    insertCandidate("retention-2", "old-key");
    assertThat(repository.enqueue(new CandidateResume("retention-2", "old-key"), now)).isTrue();
    CvRetentionWorkItem item = repository.leaseNext(now, now.plusMinutes(5)).orElseThrow();
    jdbc.update("UPDATE candidato SET resume_key = 'new-key', resume_url = 'new-url', resume_file_name = 'new.pdf' WHERE id = ?", "retention-2");

    assertThat(repository.completeDeletion(item, now)).contains(CvRetentionCompletion.SUPERSEDED);
    assertThat(jdbc.queryForObject("SELECT resume_key FROM candidato WHERE id = ?", String.class, "retention-2")).isEqualTo("new-key");
    assertThat(jdbc.queryForObject("SELECT status FROM cv_retention_work_item WHERE id = ?", String.class, item.id())).isEqualTo("SUPERSEDED");
  }

  @Test
  void expiredLeasesCanBeReclaimedForTheSameExactKey() {
    insertCandidate("retention-3", "expired-key");
    repository.enqueue(new CandidateResume("retention-3", "expired-key"), now);
    CvRetentionWorkItem first = repository.leaseNext(now, now.plusMinutes(5)).orElseThrow();

    CvRetentionWorkItem reclaimed = repository.leaseNext(now.plusMinutes(6), now.plusMinutes(11)).orElseThrow();

    assertThat(reclaimed.expectedResumeKey()).isEqualTo(first.expectedResumeKey());
    assertThat(reclaimed.attemptCount()).isEqualTo(2);
  }

  @Test
  void staleLeaseCannotChangeTheReclaimedWorkItem() {
    insertCandidate("retention-4", "stale-key");
    repository.enqueue(new CandidateResume("retention-4", "stale-key"), now);
    CvRetentionWorkItem stale = repository.leaseNext(now, now.plusMinutes(5)).orElseThrow();
    CvRetentionWorkItem current = repository.leaseNext(now.plusMinutes(6), now.plusMinutes(11)).orElseThrow();

    repository.markFailed(stale, "stale worker", now.plusMinutes(6));

    assertThat(jdbc.queryForObject("SELECT status FROM cv_retention_work_item WHERE id = ?", String.class, current.id())).isEqualTo("LEASED");
  }

  private void insertCandidate(String id, String resumeKey) {
    jdbc.update(
        "INSERT INTO candidato (id, email, telefono, resume_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        id, id + "@example.com", "+541111", resumeKey, now.minusDays(100), now.minusDays(100));
  }

  private void insertApplication(String id, String candidateId, OffsetDateTime submittedAt) {
    jdbc.update(
        "INSERT INTO postulacion (id, candidato_id, submitted_at, fecha_postulacion, updated_at) VALUES (?, ?, ?, ?, ?)",
        id, candidateId, submittedAt, submittedAt, submittedAt);
  }
}
