package com.meinardi.rrhh.presentation;

import java.time.OffsetDateTime;

public record ContactResponse(
    String id,
    String name,
    String email,
    String phone,
    String subject,
    String message,
    String status,
    OffsetDateTime createdAt) {}
