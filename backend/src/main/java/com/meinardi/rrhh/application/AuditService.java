package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.AdminAuditLog;
import com.meinardi.rrhh.domain.model.AuditOutcome;
import com.meinardi.rrhh.domain.model.Usuario;
import com.meinardi.rrhh.infrastructure.AdminAuditLogRepository;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
  private final AdminAuditLogRepository repository;
  public AuditService(AdminAuditLogRepository repository) { this.repository = repository; }
  public Page<AdminAuditLog> list(AuditQuery query, Pageable page) { return repository.list(query, page); }
  public AuditFilters filters() { return repository.filters(); }
  @Transactional public AdminAuditLog recordSuccess(String action, String resourceType, String resourceId, String ip, String userAgent, Map<String, Object> metadata) { return record(action, resourceType, resourceId, AuditOutcome.SUCCESS, ip, userAgent, metadata); }
  @Transactional(propagation = Propagation.REQUIRES_NEW) public AdminAuditLog recordDenied(String action, String resourceType, String resourceId, String ip, String userAgent, Map<String, Object> metadata) { return record(action, resourceType, resourceId, AuditOutcome.DENIED, ip, userAgent, metadata); }
  @Transactional(propagation = Propagation.REQUIRES_NEW) public AdminAuditLog recordError(String action, String resourceType, String resourceId, String ip, String userAgent, Map<String, Object> metadata) { return record(action, resourceType, resourceId, AuditOutcome.ERROR, ip, userAgent, metadata); }
  private AdminAuditLog record(String action, String resourceType, String resourceId, AuditOutcome outcome, String ip, String userAgent, Map<String, Object> metadata) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication(); Usuario actor = authentication != null && authentication.getPrincipal() instanceof Usuario user ? user : null;
    return repository.save(AdminAuditLog.create(UUID.randomUUID().toString(), actor == null ? null : actor.getId(), actor == null ? null : actor.getEmail(), action, resourceType, resourceId, outcome, ip, userAgent, metadata, OffsetDateTime.now()));
  }
}
