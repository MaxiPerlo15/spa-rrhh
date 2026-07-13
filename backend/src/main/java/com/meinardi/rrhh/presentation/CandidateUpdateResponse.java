package com.meinardi.rrhh.presentation;

import java.util.List;

public record CandidateUpdateResponse(
    String candidateId, List<ApplicationResponse> applications) {}
