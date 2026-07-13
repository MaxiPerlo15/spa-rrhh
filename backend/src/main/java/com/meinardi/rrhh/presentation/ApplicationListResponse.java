package com.meinardi.rrhh.presentation;

import java.time.OffsetDateTime;

public record ApplicationListResponse(
    String id,
    String candidateId,
    String candidateName,
    String email,
    String phone,
    String resumeUrl,
    String resumeFileName,
    String coverLetter,
    String status,
    OffsetDateTime submittedAt,
    VacancySummary vacancy) {

  public record VacancySummary(String id, String title, String location) {}
}
