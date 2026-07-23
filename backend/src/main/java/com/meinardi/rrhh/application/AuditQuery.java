package com.meinardi.rrhh.application;

import java.time.OffsetDateTime;

public record AuditQuery(String actorEmail, String action, String resourceType, OffsetDateTime dateFrom, OffsetDateTime dateTo) {}
