package com.meinardi.rrhh.presentation;

import com.meinardi.rrhh.application.ApplicationAdminInputBoundary;
import com.meinardi.rrhh.application.ApplicationIntakeInputBoundary;
import com.meinardi.rrhh.application.ApplicationListInputBoundary;
import com.meinardi.rrhh.application.SubmitApplicationCommand;
import com.meinardi.rrhh.domain.model.Postulacion;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationRestController {

  private final ApplicationIntakeInputBoundary intakeBoundary;
  private final ApplicationListInputBoundary listBoundary;
  private final ApplicationAdminInputBoundary adminBoundary;

  public ApplicationRestController(
      ApplicationIntakeInputBoundary intakeBoundary,
      ApplicationListInputBoundary listBoundary,
      ApplicationAdminInputBoundary adminBoundary) {
    this.intakeBoundary = intakeBoundary;
    this.listBoundary = listBoundary;
    this.adminBoundary = adminBoundary;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApplicationResponse submit(@Valid @RequestBody ApplicationRequest request) {
    SubmitApplicationCommand command =
        new SubmitApplicationCommand(
            request.vacancyId(),
            request.candidateName(),
            request.email(),
            request.phone(),
            request.resumeUrl(),
            request.resumeFileName(),
            request.resumeKey(),
            request.coverLetter());

    Postulacion postulacion = intakeBoundary.submitApplication(command);

    return new ApplicationResponse(
        postulacion.getId(),
        postulacion.getSubmittedAt() != null ? postulacion.getSubmittedAt() : postulacion.getFechaPostulacion(),
        postulacion.getEstadoActual() != null ? postulacion.getEstadoActual().name() : "PENDING");
  }

  @GetMapping
  public List<ApplicationListResponse> list(
      @RequestParam(required = false) String vacancyId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) String sortBy,
      @RequestParam(required = false) String sortDirection) {
    List<Postulacion> postulaciones;
    if (sortBy == null && sortDirection == null) {
      postulaciones = search == null
          ? listBoundary.listApplications(vacancyId, status)
          : listBoundary.listApplications(vacancyId, status, search);
    } else {
      postulaciones = listBoundary.listApplications(
          vacancyId,
          status,
          search,
          sortBy != null ? sortBy : "submittedAt",
          sortDirection != null ? sortDirection : "desc");
    }

    return postulaciones.stream().map(this::toListResponse).toList();
  }

  private ApplicationListResponse toListResponse(Postulacion p) {
    var candidato = p.getCandidato();
    ApplicationListResponse.VacancySummary vacancySummary = null;
    if (p.getVacante() != null) {
      var vacante = p.getVacante();
      String location =
          vacante.getUbicacion() != null ? vacante.getUbicacion().getNombre() : null;
      vacancySummary = new ApplicationListResponse.VacancySummary(vacante.getId(), vacante.getTitulo(), location);
    }

    return new ApplicationListResponse(
        p.getId(),
        candidato.getId(),
        candidato.getNombre(),
        candidato.getEmail(),
        candidato.getTelefono(),
        candidato.getResumeUrl(),
        candidato.getResumeFileName(),
        p.getObservacion(),
        p.getEstadoActual() != null ? p.getEstadoActual().name() : "PENDING",
        p.getSubmittedAt() != null ? p.getSubmittedAt() : p.getFechaPostulacion(),
        vacancySummary);
  }

  @GetMapping("/{id}")
  public ApplicationDetailResponse getById(@PathVariable String id) {
    return adminBoundary.getById(id);
  }

  @PatchMapping("/{id}/status")
  public ApplicationDetailResponse updateStatus(
      @PathVariable String id,
      @Valid @RequestBody ApplicationStatusUpdateRequest request) {
    return adminBoundary.updateStatus(id, request.status());
  }

  @DeleteMapping("/{id}")
  public java.util.Map<String, Boolean> delete(@PathVariable String id) {
    adminBoundary.delete(id);
    return java.util.Map.of("success", true);
  }
}
