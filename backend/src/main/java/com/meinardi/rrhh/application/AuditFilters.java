package com.meinardi.rrhh.application;

import java.util.List;

public record AuditFilters(List<String> actions, List<String> resourceTypes, List<String> actorEmails) {}
