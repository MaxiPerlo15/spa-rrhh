package com.meinardi.rrhh.infrastructure;

import com.meinardi.rrhh.application.CandidateResume;
import com.meinardi.rrhh.application.CvRetentionCompletion;
import com.meinardi.rrhh.application.CvRetentionWorkItem;
import com.meinardi.rrhh.application.CvRetentionWorkRepository;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcCvRetentionWorkRepository implements CvRetentionWorkRepository {
  private final JdbcTemplate jdbc;

  public JdbcCvRetentionWorkRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public List<CandidateResume> findCandidates(OffsetDateTime cutoff) {
    return jdbc.query(
        "SELECT DISTINCT c.id, c.resume_key FROM candidato c "
            + "JOIN postulacion p ON p.candidato_id = c.id "
            + "WHERE c.resume_key IS NOT NULL AND p.submitted_at <= ? "
            + "AND NOT EXISTS (SELECT 1 FROM postulacion newer "
            + "WHERE newer.candidato_id = c.id AND newer.submitted_at > ?) "
            + "ORDER BY c.id",
        (rs, row) -> new CandidateResume(rs.getString("id"), rs.getString("resume_key")),
        cutoff,
        cutoff);
  }

  @Override
  public boolean enqueue(CandidateResume candidate, OffsetDateTime nextAttemptAt) {
    return jdbc.update(
            "INSERT INTO cv_retention_work_item "
                + "(id, candidate_id, expected_resume_key, status, attempt_count, next_attempt_at, created_at, updated_at) "
                + "VALUES (?, ?, ?, 'PENDING', 0, ?, ?, ?) ON CONFLICT (candidate_id, expected_resume_key) DO NOTHING",
            UUID.randomUUID().toString(),
            candidate.candidateId(),
            candidate.resumeKey(),
            nextAttemptAt,
            nextAttemptAt,
            nextAttemptAt)
        == 1;
  }

  @Override
  @Transactional
  public Optional<CvRetentionWorkItem> leaseNext(OffsetDateTime now, OffsetDateTime leaseUntil) {
    String leaseToken = UUID.randomUUID().toString();
    List<CvRetentionWorkItem> leased =
        jdbc.query(
            "WITH next_item AS ("
                + " SELECT id FROM cv_retention_work_item"
                + " WHERE ((status IN ('PENDING', 'RETRY_WAIT') AND next_attempt_at <= ?)"
                + " OR (status = 'LEASED' AND lease_until <= ?))"
                + " ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT 1"
                + ") UPDATE cv_retention_work_item item"
                + " SET status = 'LEASED', attempt_count = item.attempt_count + 1, lease_token = ?, lease_until = ?, updated_at = ?"
                + " FROM next_item WHERE item.id = next_item.id"
                + " RETURNING item.id, item.candidate_id, item.expected_resume_key, item.attempt_count, item.lease_token",
            (rs, row) -> map(rs),
            now,
            now,
            leaseToken,
            leaseUntil,
            now);
    return leased.stream().findFirst();
  }

  @Override
  @Transactional
  public Optional<CvRetentionCompletion> completeDeletion(CvRetentionWorkItem item, OffsetDateTime completedAt) {
    if (jdbc.queryForList(
            "SELECT id FROM cv_retention_work_item WHERE id = ? AND status = 'LEASED' AND lease_token = ? FOR UPDATE",
            item.id(),
            item.leaseToken())
        .isEmpty()) {
      return Optional.empty();
    }
    int cleared =
        jdbc.update(
            "UPDATE candidato SET resume_key = NULL, resume_url = NULL, resume_file_name = NULL "
                + "WHERE id = ? AND resume_key = ?",
            item.candidateId(),
            item.expectedResumeKey());
    CvRetentionCompletion completion = cleared == 1 ? CvRetentionCompletion.SUCCEEDED : CvRetentionCompletion.SUPERSEDED;
    jdbc.update(
        "UPDATE cv_retention_work_item SET status = ?, lease_token = NULL, lease_until = NULL, updated_at = ? WHERE id = ? AND status = 'LEASED' AND lease_token = ?",
        completion.name(),
        completedAt,
        item.id(),
        item.leaseToken());
    return Optional.of(completion);
  }

  @Override
  @Transactional
  public void markRetry(CvRetentionWorkItem item, int attemptCount, OffsetDateTime nextAttemptAt, String error, OffsetDateTime updatedAt) {
    jdbc.update(
        "UPDATE cv_retention_work_item SET status = 'RETRY_WAIT', attempt_count = ?, next_attempt_at = ?, lease_token = NULL, lease_until = NULL, last_error = ?, updated_at = ? WHERE id = ? AND status = 'LEASED' AND lease_token = ?",
        attemptCount,
        nextAttemptAt,
        error,
        updatedAt,
        item.id(),
        item.leaseToken());
  }

  @Override
  @Transactional
  public void markFailed(CvRetentionWorkItem item, String error, OffsetDateTime updatedAt) {
    jdbc.update(
        "UPDATE cv_retention_work_item SET status = 'FAILED', lease_token = NULL, lease_until = NULL, last_error = ?, updated_at = ? WHERE id = ? AND status = 'LEASED' AND lease_token = ?",
        error,
        updatedAt,
        item.id(),
        item.leaseToken());
  }

  private CvRetentionWorkItem map(ResultSet rs) throws java.sql.SQLException {
    return new CvRetentionWorkItem(
        rs.getString("id"),
        rs.getString("candidate_id"),
        rs.getString("expected_resume_key"),
        rs.getInt("attempt_count"),
        rs.getString("lease_token"));
  }
}
