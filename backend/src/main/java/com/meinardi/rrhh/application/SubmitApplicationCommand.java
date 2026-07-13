package com.meinardi.rrhh.application;

import jakarta.validation.constraints.NotBlank;

public record SubmitApplicationCommand(
    String vacancyId,
    @NotBlank String candidateName,
    @NotBlank String email,
    @NotBlank String phone,
    String resumeUrl,
    String resumeFileName,
    String resumeKey,
    String coverLetter) {
  public static SubmitApplicationCommand from(
      String vacancyId,
      String candidateName,
      String email,
      String phone,
      String resumeUrl,
      String resumeFileName,
      String resumeKey,
      String coverLetter) {
    return new SubmitApplicationCommand(
        vacancyId, candidateName, email, phone, resumeUrl, resumeFileName, resumeKey, coverLetter);
  }
}
