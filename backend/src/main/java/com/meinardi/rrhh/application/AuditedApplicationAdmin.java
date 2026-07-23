package com.meinardi.rrhh.application;

import com.meinardi.rrhh.presentation.ApplicationDetailResponse;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
public class AuditedApplicationAdmin implements ApplicationAdminInputBoundary {
  private static final Logger log = LoggerFactory.getLogger(AuditedApplicationAdmin.class);
  private final ApplicationManager applications;
  private final AuditService auditService;

  public AuditedApplicationAdmin(ApplicationManager applications, AuditService auditService) {
    this.applications = applications;
    this.auditService = auditService;
  }

  @Override
  @Transactional
  public ApplicationDetailResponse getById(String id) {
    return audit("application.view", id, () -> applications.getById(id), Map.of());
  }

  @Override
  @Transactional
  public ApplicationDetailResponse updateStatus(String id, String status) {
    return audit(
        "application.update_status",
        id,
        () -> applications.updateStatus(id, status),
        Map.of("newStatus", status));
  }

  @Override
  @Transactional
  public void delete(String id) {
    audit("application.delete", id, () -> {
      applications.delete(id);
      return null;
    }, Map.of());
  }

  private <T> T audit(String action, String resourceId, Action<T> actionCall, Map<String, Object> metadata) {
    try {
      T result = actionCall.run();
      auditService.recordSuccess(action, "application", resourceId, null, null, metadata);
      return result;
    } catch (RuntimeException exception) {
      try {
        auditService.recordError(
            action,
            "application",
            resourceId,
            null,
            null,
            Map.of("error", exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage()));
      } catch (RuntimeException auditFailure) {
        log.error("Unable to persist {} ERROR audit event", action, auditFailure);
      }
      throw exception;
    }
  }

  @FunctionalInterface
  private interface Action<T> {
    T run();
  }
}
