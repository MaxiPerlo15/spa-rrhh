CREATE INDEX "AdminAuditLog_filter_createdAt_idx" ON "AdminAuditLog" ("actorEmail", "action", "resourceType", "createdAt" DESC);
