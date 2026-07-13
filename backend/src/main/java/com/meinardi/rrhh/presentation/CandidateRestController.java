package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.CandidateAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/candidates")
public class CandidateRestController {

  private final CandidateAdminService candidateAdminService;

  public CandidateRestController(CandidateAdminService candidateAdminService) {
    this.candidateAdminService = candidateAdminService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CandidateCreateResponse create(@Valid @RequestBody CandidateCreateRequest request) {
    CandidateAdminService.CreateResult result =
        candidateAdminService.manualCreate(
            request.candidateName(), request.email(), request.phone(), request.notes());
    return new CandidateCreateResponse(result.candidateId(), null, result.applicationId());
  }

  @PatchMapping("/{id}")
  public CandidateUpdateResponse update(
      @PathVariable String id, @Valid @RequestBody CandidateUpdateRequest request) {
    CandidateAdminService.UpdateResult result =
        candidateAdminService.updateIdentity(
            id, request.candidateName(), request.email(), request.phone());
    return new CandidateUpdateResponse(result.candidateId(), java.util.List.of());
  }
}
