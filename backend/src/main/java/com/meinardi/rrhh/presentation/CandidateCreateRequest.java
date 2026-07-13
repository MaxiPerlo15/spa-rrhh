package com.meinardi.rrhh.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CandidateCreateRequest(
    @NotBlank String candidateName,
    @NotBlank @Email String email,
    @NotBlank String phone,
    String notes) {}
