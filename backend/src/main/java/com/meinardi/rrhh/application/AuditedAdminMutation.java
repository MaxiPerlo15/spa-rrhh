package com.meinardi.rrhh.application;

import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditedAdminMutation {
  private static final Logger log = LoggerFactory.getLogger(AuditedAdminMutation.class);
  private final AuditService auditService;

  public AuditedAdminMutation(AuditService auditService) {
    this.auditService = auditService;
  }

  @Transactional
  public <T> T execute(String action, String resourceType, String resourceId, String ip, String userAgent, Map<String, Object> metadata, Supplier<T> mutation) {
    try {
      T result = mutation.get();
      auditService.recordSuccess(action, resourceType, resourceId, ip, userAgent, metadata);
      return result;
    } catch (RuntimeException exception) {
      try {
        auditService.recordError(action, resourceType, resourceId, ip, userAgent, Map.of("error", message(exception)));
      } catch (RuntimeException auditFailure) {
        log.error("Unable to persist {} ERROR audit event", action, auditFailure);
      }
      throw exception;
    }
  }

  private String message(RuntimeException exception) {
    return exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
  }
}
