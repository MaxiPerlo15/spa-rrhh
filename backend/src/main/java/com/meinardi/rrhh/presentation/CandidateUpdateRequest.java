package com.meinardi.rrhh.presentation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CandidateUpdateRequest(
    @NotBlank String candidateName,
    @NotBlank @Email String email,
    @NotBlank String phone) {}
