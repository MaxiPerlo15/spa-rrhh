package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.*;
import com.meinardi.rrhh.infrastructure.CandidatoRepository;
import com.meinardi.rrhh.infrastructure.PostulacionRepository;
import com.meinardi.rrhh.infrastructure.VacanteRepository;
import com.meinardi.rrhh.presentation.ApplicationDetailResponse;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ApplicationManager
    implements ApplicationIntakeInputBoundary, ApplicationListInputBoundary, ApplicationAdminInputBoundary {

  private static final int DUPLICATE_WINDOW_HOURS = 24;

  private final CandidatoRepository candidatoRepository;
  private final PostulacionRepository postulacionRepository;
  private final VacanteRepository vacanteRepository;

  public ApplicationManager(
      CandidatoRepository candidatoRepository,
      PostulacionRepository postulacionRepository,
      VacanteRepository vacanteRepository) {
    this.candidatoRepository = candidatoRepository;
    this.postulacionRepository = postulacionRepository;
    this.vacanteRepository = vacanteRepository;
  }

  public static String buildPersonKey(String email, String phone) {
    String normalizedEmail = email.trim().toLowerCase();
    String trimmedPhone = phone.trim();
    boolean hasPlus = trimmedPhone.startsWith("+");
    String digits = trimmedPhone.replaceAll("\\D", "");
    String normalizedPhone = hasPlus ? "+" + digits : digits;
    String fingerprint = normalizedEmail + "|" + normalizedPhone;

    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(fingerprint.getBytes());
      return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("SHA-256 not available", e);
    }
  }

  @Override
  @Transactional
  public Postulacion submitApplication(SubmitApplicationCommand command) {
    String personKey = buildPersonKey(command.email(), command.phone());

    // Find or create candidate
    Candidato candidato =
        candidatoRepository
            .findByPersonKey(personKey)
            .orElseGet(
                () -> {
                  String cvValue =
                      command.resumeFileName() != null ? command.resumeFileName() : "";
                  Candidato newCandidato =
                      Candidato.create(
                          command.candidateName(),
                          command.email(),
                          command.phone(),
                          cvValue);
                  newCandidato.setPersonKey(personKey);
                  newCandidato.setResumeUrl(command.resumeUrl());
                  newCandidato.setResumeFileName(command.resumeFileName());
                  newCandidato.setResumeKey(command.resumeKey());
                  return candidatoRepository.save(newCandidato);
                });

    // Upsert candidate details if existing
    if (candidato.getNombre() != null
        && !candidato.getNombre().equals(command.candidateName())) {
      candidato.setNombre(command.candidateName());
    }
    if (command.resumeUrl() != null) {
      candidato.setResumeUrl(command.resumeUrl());
    }
    if (command.resumeFileName() != null) {
      candidato.setResumeFileName(command.resumeFileName());
    }
    if (command.resumeKey() != null) {
      candidato.setResumeKey(command.resumeKey());
    }
    candidato.setUpdatedAt(OffsetDateTime.now());

    // Validate vacancy if provided
    Vacante vacante = null;
    if (command.vacancyId() != null) {
      vacante =
          vacanteRepository
              .findById(command.vacancyId())
              .orElseThrow(() -> new IllegalArgumentException("vacante not found"));
      if (!vacante.canReceiveApplications()) {
        throw new IllegalStateException("Solo las vacantes activas pueden recibir postulaciones");
      }
    }

    // 24h duplicate check
    OffsetDateTime since = OffsetDateTime.now().minusHours(DUPLICATE_WINDOW_HOURS);
    if (vacante != null) {
      List<Postulacion> recent =
          postulacionRepository.findRecentByCandidatoAndVacante(
              candidato.getId(), vacante.getId(), since);
      if (!recent.isEmpty()) {
        throw new IllegalStateException(
            "Ya recibimos una postulación reciente para esta vacante. "
                + "Podrás volver a postularte en 24 horas.");
      }
    } else {
      List<Postulacion> recentSpontaneous =
          postulacionRepository.findRecentSpontaneousByCandidato(candidato.getId(), since);
      if (!recentSpontaneous.isEmpty()) {
        throw new IllegalStateException(
            "Ya recibimos una postulación espontánea reciente. "
                + "Podrás volver a postularte en 24 horas.");
      }
    }

    // Create postulacion
    Postulacion postulacion;
    if (vacante != null) {
      postulacion = Postulacion.createForVacancy(vacante, candidato, command.coverLetter());
    } else {
      postulacion = Postulacion.createSpontaneous(candidato, command.coverLetter());
    }
    postulacion.setSubmittedAt(OffsetDateTime.now());

    return postulacionRepository.save(postulacion);
  }

  @Override
  @Transactional(readOnly = true)
  public List<Postulacion> listApplications(String vacancyId, String status) {
    if (vacancyId != null && status != null) {
      ApplicationStatus appStatus = ApplicationStatus.valueOf(status);
      return postulacionRepository.findAll().stream()
          .filter(p -> vacancyId.equals(p.getVacante() != null ? p.getVacante().getId() : null))
          .filter(p -> appStatus.equals(p.getEstadoActual()))
          .toList();
    }
    if (vacancyId != null) {
      return postulacionRepository.findAll().stream()
          .filter(p -> vacancyId.equals(p.getVacante() != null ? p.getVacante().getId() : null))
          .toList();
    }
    if (status != null) {
      ApplicationStatus appStatus = ApplicationStatus.valueOf(status);
      return postulacionRepository.findAll().stream()
          .filter(p -> appStatus.equals(p.getEstadoActual()))
          .toList();
    }
    return postulacionRepository.findAll();
  }

  @Override
  @Transactional(readOnly = true)
  public ApplicationDetailResponse getById(String id) {
    Postulacion postulacion =
        postulacionRepository
            .findByIdWithCandidatoAndVacante(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    return toDetailResponse(postulacion);
  }

  @Override
  @Transactional
  public ApplicationDetailResponse updateStatus(String id, String newStatus) {
    Postulacion postulacion =
        postulacionRepository
            .findByIdWithCandidatoAndVacante(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

    ApplicationStatus targetStatus = ApplicationStatus.valueOf(newStatus);
    // Delegate to entity — throws IllegalStateException for invalid/same-state transitions
    if (targetStatus == ApplicationStatus.REVIEWING) {
      postulacion.ponerEnRevision();
    } else if (targetStatus == ApplicationStatus.INTERVIEWED) {
      postulacion.marcarComoEntrevistado();
    } else if (targetStatus == ApplicationStatus.ACCEPTED) {
      postulacion.aceptar();
    } else if (targetStatus == ApplicationStatus.REJECTED) {
      postulacion.rechazar();
    } else {
      throw new IllegalArgumentException("Invalid status: " + newStatus);
    }

    postulacion.setUpdatedAt(OffsetDateTime.now());
    Postulacion saved = postulacionRepository.save(postulacion);
    return toDetailResponse(saved);
  }

  @Override
  @Transactional
  public void delete(String id) {
    Postulacion postulacion =
        postulacionRepository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    postulacionRepository.delete(postulacion);
  }

  private ApplicationDetailResponse toDetailResponse(Postulacion p) {
    var candidato = p.getCandidato();
    ApplicationDetailResponse.VacancySummary vacancySummary = null;
    if (p.getVacante() != null) {
      var vacante = p.getVacante();
      String location = vacante.getUbicacion() != null ? vacante.getUbicacion().getNombre() : null;
      vacancySummary = new ApplicationDetailResponse.VacancySummary(vacante.getId(), vacante.getTitulo(), location);
    }
    return new ApplicationDetailResponse(
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
}
