package com.meinardi.rrhh.domain.model;

import java.time.OffsetDateTime;

public class AdminNotification {
  private String id; private String title; private String message; private NotificationLevel level; private boolean isRead; private String actionLabel; private ActionType actionType; private String actionResourceId; private OffsetDateTime createdAt; private OffsetDateTime updatedAt;
  protected AdminNotification() {}
  public static AdminNotification create(String id, String title, String message, NotificationLevel level, String actionLabel, String actionType, String actionResourceId) {
    AdminNotification n = new AdminNotification(); n.id = id; n.title = title.trim(); n.message = message.trim(); n.level = level; n.actionLabel = actionLabel; n.actionType = actionType == null ? null : ActionType.valueOf(actionType); n.actionResourceId = actionResourceId; n.createdAt = OffsetDateTime.now(); n.updatedAt = n.createdAt; return n;
  }
  public void setRead(boolean read) { isRead = read; updatedAt = OffsetDateTime.now(); }
  public static AdminNotification persisted(String id, String title, String message, String level, boolean isRead, String actionLabel, String actionType, String actionResourceId, OffsetDateTime createdAt, OffsetDateTime updatedAt) { AdminNotification n = create(id, title, message, NotificationLevel.valueOf(level), actionLabel, actionType, actionResourceId); n.isRead = isRead; n.createdAt = createdAt; n.updatedAt = updatedAt; return n; }
  public String getId() { return id; } public String getTitle() { return title; } public String getMessage() { return message; } public NotificationLevel getLevel() { return level; } public boolean isRead() { return isRead; } public String getActionLabel() { return actionLabel; } public ActionType getActionType() { return actionType; } public String getActionResourceId() { return actionResourceId; } public OffsetDateTime getCreatedAt() { return createdAt; } public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public enum ActionType { VACANCY, APPLICATION, CONTACT }
}
