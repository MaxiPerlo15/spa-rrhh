package com.meinardi.rrhh.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

public class AdminAuditLog {
  private final String id, actorId, actorEmail, action, resourceType, resourceId, ip, userAgent;
  private final AuditOutcome outcome;
  private final Map<String, Object> metadata;
  private final OffsetDateTime createdAt;
  private AdminAuditLog(String id, String actorId, String actorEmail, String action, String resourceType, String resourceId, AuditOutcome outcome, String ip, String userAgent, Map<String, Object> metadata, OffsetDateTime createdAt) {
    this.id = id; this.actorId = actorId; this.actorEmail = actorEmail; this.action = action; this.resourceType = resourceType; this.resourceId = resourceId; this.outcome = outcome; this.ip = ip; this.userAgent = userAgent; this.metadata = metadata == null ? Map.of() : Map.copyOf(metadata); this.createdAt = createdAt;
  }
  public static AdminAuditLog create(String id, String actorId, String actorEmail, String action, String resourceType, String resourceId, AuditOutcome outcome, String ip, String userAgent, Map<String, Object> metadata, OffsetDateTime createdAt) {
    return new AdminAuditLog(id, actorId, actorEmail, action, resourceType, resourceId, outcome, ip, userAgent, metadata, createdAt);
  }
  public String getId() { return id; } public String getActorId() { return actorId; } public String getActorEmail() { return actorEmail; } public String getAction() { return action; } public String getResourceType() { return resourceType; } public String getResourceId() { return resourceId; } public AuditOutcome getOutcome() { return outcome; } public String getIp() { return ip; } public String getUserAgent() { return userAgent; } public Map<String, Object> getMetadata() { return metadata; } public OffsetDateTime getCreatedAt() { return createdAt; }
}
