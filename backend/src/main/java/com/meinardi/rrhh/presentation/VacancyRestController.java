package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.AuditedAdminMutation;
import com.meinardi.rrhh.application.AuditedVacancyCreator;
import com.meinardi.rrhh.application.ActivateVacancyInputBoundary;
import com.meinardi.rrhh.application.CloseVacancyInputBoundary;
import com.meinardi.rrhh.application.CreateVacancyCommand;
import com.meinardi.rrhh.application.DeactivateVacancyInputBoundary;
import com.meinardi.rrhh.application.GetVacancyInputBoundary;
import com.meinardi.rrhh.application.ListVacanciesInputBoundary;
import com.meinardi.rrhh.application.UpdateVacancyCommand;
import com.meinardi.rrhh.application.UpdateVacancyInputBoundary;
import com.meinardi.rrhh.domain.model.Vacante;
import com.meinardi.rrhh.infrastructure.AuditRequestContext;
import com.meinardi.rrhh.infrastructure.AuditRequestContextResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vacancies")
public class VacancyRestController {
  private final AuditedVacancyCreator auditedVacancyCreator;
  private final AuditedAdminMutation auditedMutation;
  private final GetVacancyInputBoundary getVacancyInputBoundary;
  private final UpdateVacancyInputBoundary updateVacancyInputBoundary;
  private final ActivateVacancyInputBoundary activateVacancyInputBoundary;
  private final DeactivateVacancyInputBoundary deactivateVacancyInputBoundary;
  private final CloseVacancyInputBoundary closeVacancyInputBoundary;
  private final ListVacanciesInputBoundary listVacanciesInputBoundary;

  public VacancyRestController(
      AuditedVacancyCreator auditedVacancyCreator,
      AuditedAdminMutation auditedMutation,
      GetVacancyInputBoundary getVacancyInputBoundary,
      UpdateVacancyInputBoundary updateVacancyInputBoundary,
      ActivateVacancyInputBoundary activateVacancyInputBoundary,
      DeactivateVacancyInputBoundary deactivateVacancyInputBoundary,
      CloseVacancyInputBoundary closeVacancyInputBoundary,
      ListVacanciesInputBoundary listVacanciesInputBoundary) {
    this.auditedVacancyCreator = auditedVacancyCreator;
    this.auditedMutation = auditedMutation;
    this.getVacancyInputBoundary = getVacancyInputBoundary;
    this.updateVacancyInputBoundary = updateVacancyInputBoundary;
    this.activateVacancyInputBoundary = activateVacancyInputBoundary;
    this.deactivateVacancyInputBoundary = deactivateVacancyInputBoundary;
    this.closeVacancyInputBoundary = closeVacancyInputBoundary;
    this.listVacanciesInputBoundary = listVacanciesInputBoundary;
  }

  @GetMapping
  public List<VacancyResponse> list(@RequestParam(defaultValue = "false") boolean all) {
    return listVacanciesInputBoundary.listVacancies(all).stream().map(VacancyResponse::from).toList();
  }

  @GetMapping("/{id}")
  public VacancyResponse get(@PathVariable String id) {
    return VacancyResponse.from(getVacancyInputBoundary.getVacancy(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VacancyResponse create(
      @Valid @RequestBody CreateVacancyCommand command,
      @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      HttpServletRequest request) {
    Vacante created = auditedVacancyCreator.create(
        command, forwardedFor == null ? request.getRemoteAddr() : forwardedFor, userAgent);
    return VacancyResponse.from(created);
  }

  @PatchMapping("/{id}")
  public VacancyResponse update(
      @PathVariable String id,
      @Valid @RequestBody UpdateVacancyCommand command,
      HttpServletRequest request) {
    AuditRequestContext auditContext = AuditRequestContextResolver.resolve(request);
    Vacante updated =
        auditedMutation.execute(
            "vacancy.update",
            "vacancy",
            id,
            auditContext.ip(),
            auditContext.userAgent(),
            Map.of(),
        () -> updateVacancyInputBoundary.updateVacancy(id, command));
    return VacancyResponse.from(updated);
  }

  @PatchMapping("/{id}/close")
  public VacancyResponse close(@PathVariable String id, HttpServletRequest request) {
    Vacante closed =
        audited("vacancy.close", id, request, () -> closeVacancyInputBoundary.closeVacancy(id));
    return VacancyResponse.from(closed);
  }

  @PatchMapping("/{id}/activate")
  public VacancyResponse activate(@PathVariable String id, HttpServletRequest request) {
    Vacante activated =
        audited("vacancy.activate", id, request, () -> activateVacancyInputBoundary.activateVacancy(id));
    return VacancyResponse.from(activated);
  }

  @PatchMapping("/{id}/deactivate")
  public VacancyResponse deactivate(@PathVariable String id, HttpServletRequest request) {
    Vacante deactivated =
        audited(
            "vacancy.deactivate", id, request, () -> deactivateVacancyInputBoundary.deactivateVacancy(id));
    return VacancyResponse.from(deactivated);
  }

  private Vacante audited(
      String action, String id, HttpServletRequest request, Supplier<Vacante> mutation) {
    AuditRequestContext auditContext = AuditRequestContextResolver.resolve(request);
    return auditedMutation.execute(
        action,
        "vacancy",
        id,
        auditContext.ip(),
        auditContext.userAgent(),
        Map.of(),
        mutation);
  }
}
