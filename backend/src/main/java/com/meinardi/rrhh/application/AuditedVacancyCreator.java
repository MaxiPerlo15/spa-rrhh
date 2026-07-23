package com.meinardi.rrhh.application;

import com.meinardi.rrhh.domain.model.Vacante;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuditedVacancyCreator {
  private static final Logger log = LoggerFactory.getLogger(AuditedVacancyCreator.class);
  private final CreateVacancyInputBoundary creator;
  private final AuditService auditService;

  public AuditedVacancyCreator(CreateVacancyInputBoundary creator, AuditService auditService) {
    this.creator = creator;
    this.auditService = auditService;
  }

  @Transactional
  public Vacante create(CreateVacancyCommand command, String ip, String userAgent) {
    String resourceId = null;
    try {
      Vacante vacancy = creator.registerVacancy(command);
      resourceId = vacancy.getId();
      auditService.recordSuccess(
          "vacancy.create",
          "vacancy",
          resourceId,
          ip,
          userAgent,
          Map.of("title", vacancy.getTitulo(), "status", vacancy.getEstadoActual().name()));
      return vacancy;
    } catch (RuntimeException exception) {
      try {
        auditService.recordError(
            "vacancy.create", "vacancy", resourceId, ip, userAgent, Map.of("error", exception.getMessage()));
      } catch (RuntimeException auditFailure) {
        log.error("Unable to persist vacancy.create ERROR audit event", auditFailure);
      }
      throw exception;
    }
  }
}
