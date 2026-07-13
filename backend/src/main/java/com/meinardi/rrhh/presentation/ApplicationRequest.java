package com.meinardi.rrhh.presentation;

import jakarta.validation.constraints.NotBlank;

public record ApplicationRequest(
    String vacancyId,
    @NotBlank String candidateName,
    @NotBlank String email,
    @NotBlank String phone,
    String resumeUrl,
    String resumeFileName,
    String resumeKey,
    String coverLetter) {}
