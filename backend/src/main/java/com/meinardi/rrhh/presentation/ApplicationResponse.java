package com.meinardi.rrhh.presentation;

import java.time.OffsetDateTime;

public record ApplicationResponse(String id, OffsetDateTime submittedAt, String status) {}
