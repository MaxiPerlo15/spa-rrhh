package com.meinardi.rrhh.application;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AuditedCandidateAdmin {
  private static final Logger log = LoggerFactory.getLogger(AuditedCandidateAdmin.class);
  private final CandidateAdminService candidates;
  private final AuditService auditService;
  public AuditedCandidateAdmin(CandidateAdminService candidates, AuditService auditService) {
    this.candidates = candidates;
    this.auditService = auditService;
  }
  @Transactional
  public CandidateAdminService.CreateResult manualCreate(
      String candidateName, String email, String phone, String notes, String ip, String userAgent) {
    try {
      CandidateAdminService.CreateResult result =
          candidates.manualCreate(candidateName, email, phone, notes);
      auditService.recordSuccess(
          "candidate.create",
          "candidate",
          result.candidateId(),
          ip,
          userAgent,
          Map.of("candidateName", candidateName, "email", email, "source", "admin-manual"));
      return result;
    } catch (RuntimeException exception) {
      recordError("candidate.create", null, ip, userAgent, exception);
      throw exception;
    }
  }
  @Transactional
  public CandidateAdminService.UpdateResult updateIdentity(
      String id, String candidateName, String email, String phone, String ip, String userAgent) {
    try {
      CandidateAdminService.UpdateResult result =
          candidates.updateIdentity(id, candidateName, email, phone);
      auditService.recordSuccess(
          "candidate.update",
          "candidate",
          result.candidateId(),
          ip,
          userAgent,
          Map.of("candidateName", candidateName, "email", email, "phone", phone));
      return result;
    } catch (RuntimeException exception) {
      recordError("candidate.update", id, ip, userAgent, exception);
      throw exception;
    }
  }
  private void recordError(
      String action, String resourceId, String ip, String userAgent, RuntimeException exception) {
    try {
      auditService.recordError(
          action,
          "candidate",
          resourceId,
          ip,
          userAgent,
          Map.of(
              "error",
              exception.getMessage() == null
                  ? exception.getClass().getSimpleName()
                  : exception.getMessage()));
    } catch (RuntimeException auditFailure) {
      log.error("Unable to persist {} ERROR audit event", action, auditFailure);
    }
  }
}
