package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.AuditedCandidateAdmin;
import com.meinardi.rrhh.application.CandidateAdminService;
import jakarta.servlet.http.HttpServletRequest;
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

  private final AuditedCandidateAdmin candidateAdmin;

  public CandidateRestController(AuditedCandidateAdmin candidateAdmin) {
    this.candidateAdmin = candidateAdmin;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CandidateCreateResponse create(
      @Valid @RequestBody CandidateCreateRequest request, HttpServletRequest servletRequest) {
    CandidateAdminService.CreateResult result =
        candidateAdmin.manualCreate(
            request.candidateName(),
            request.email(),
            request.phone(),
            request.notes(),
            clientIp(servletRequest),
            servletRequest.getHeader("User-Agent"));
    return new CandidateCreateResponse(result.candidateId(), null, result.applicationId());
  }

  @PatchMapping("/{id}")
  public CandidateUpdateResponse update(
      @PathVariable String id,
      @Valid @RequestBody CandidateUpdateRequest request,
      HttpServletRequest servletRequest) {
    CandidateAdminService.UpdateResult result =
        candidateAdmin.updateIdentity(
            id,
            request.candidateName(),
            request.email(),
            request.phone(),
            clientIp(servletRequest),
            servletRequest.getHeader("User-Agent"));
    return new CandidateUpdateResponse(result.candidateId(), java.util.List.of());
  }

  private String clientIp(HttpServletRequest request) {
    String forwardedFor = request.getHeader("X-Forwarded-For");
    return forwardedFor == null ? request.getRemoteAddr() : forwardedFor.split(",", 2)[0].trim();
  }
}
